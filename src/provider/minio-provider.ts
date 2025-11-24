import { Client as MinioClient } from "minio";
import { lookup as getMimeType } from "mime-types";
import { Readable } from "stream";
import {
  SignedUrlOptions,
  SignedUrlResponse,
  StrapiFile,
  StrapiProvider,
} from "../index.types";
import { DeleteError, SignedUrlError, UploadError } from "../errors/provider-errors";
import { NormalizedConfig } from "../utils/config-validator";
import { createMinioClient } from "./minio-client-factory";
import {
  buildHostUrl,
  createFileUrl,
  isFileFromSameBucket,
  pathnameContainsBucket,
} from "../utils/url-builder";
import {
  buildUploadPath,
  extractFilePathFromUrl,
} from "../utils/path-builder";
import { getLogger, type Logger } from "../utils/logger";

const DEFAULT_MIME_TYPE = "application/octet-stream";

/**
 * MinIO provider for Strapi upload plugin
 */
/**
 * Cache entry for bucket existence check
 */
interface BucketCheckCache {
  exists: boolean;
  timestamp: number;
}

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const BUCKET_CHECK_CACHE_TTL = 5 * 60 * 1000;

export class MinioProvider implements StrapiProvider {
  private readonly client: MinioClient;
  private readonly config: NormalizedConfig;
  private readonly hostUrl: string;
  private readonly logger: Logger;
  private bucketCheckCache: BucketCheckCache | null = null;

  constructor(config: NormalizedConfig, logger?: Logger) {
    this.config = config;
    this.client = createMinioClient(config);
    this.hostUrl = buildHostUrl(config);
    this.logger = logger || getLogger();
    // Check bucket existence asynchronously without blocking initialization
    // Use process.nextTick to avoid blocking and ensure it runs after constructor
    // Only check if not in test environment to avoid test warnings
    if (process.env.NODE_ENV !== "test") {
      process.nextTick(() => {
        this.checkBucketExists().catch(() => {
          // Silently ignore errors - we don't want to break Strapi initialization
        });
      });
    }
  }

  /**
   * Checks if the cached bucket existence result is still valid
   */
  private isBucketCheckCacheValid(): boolean {
    if (!this.bucketCheckCache) {
      return false;
    }
    const now = Date.now();
    return now - this.bucketCheckCache.timestamp < BUCKET_CHECK_CACHE_TTL;
  }

  /**
   * Checks if the bucket exists with optional logging and caching
   * This method never throws errors to avoid breaking Strapi initialization
   * @param silent If true, connection errors are silently ignored (no logging)
   * @param useCache If true, uses cached result if available and valid
   * Note: Bucket existence warnings are always logged regardless of silent parameter
   *       since silent only controls error logging, not bucket existence warnings
   */
  private async checkBucketExists(
    silent: boolean = false,
    useCache: boolean = true
  ): Promise<void> {
    // Check cache first if enabled
    if (useCache && this.isBucketCheckCacheValid()) {
      const cached = this.bucketCheckCache!;
      // Always log bucket existence warnings, even when silent=true
      // silent only controls error logging, not bucket existence warnings
      if (!cached.exists) {
        this.logger.warn(
          `[strapi-provider-upload-minio] Warning: Bucket "${this.config.bucket}" does not exist (cached). Uploads will fail.`
        );
      }
      return;
    }

    try {
      const exists = await this.client.bucketExists(this.config.bucket);
      
      // Update cache
      this.bucketCheckCache = {
        exists,
        timestamp: Date.now(),
      };

      // Always log bucket existence warnings, even when silent=true
      // silent only controls error logging, not bucket existence warnings
      if (!exists) {
        const message = silent
          ? `Upload will fail. Please create the bucket first.`
          : `Please create it before uploading files. Uploads will fail until the bucket is created.`;
        this.logger.warn(
          `[strapi-provider-upload-minio] Warning: Bucket "${this.config.bucket}" does not exist. ${message}`
        );
      }
    } catch (error) {
      // Only log warning if not silent - we don't want to break Strapi
      // silent controls error logging (connection issues, etc.)
      if (!silent) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(
          `[strapi-provider-upload-minio] Warning: Could not verify bucket "${this.config.bucket}" existence: ${errorMessage}. ` +
            `This may indicate a connection issue with MinIO. Uploads may fail.`
        );
      }
      // Don't cache errors - next check should retry
    }
  }

  /**
   * Uploads a file stream to MinIO
   */
  public async uploadStream(file: StrapiFile): Promise<void> {
    return this.upload(file);
  }

  /**
   * Uploads a file to MinIO
   */
  public async upload(file: StrapiFile): Promise<void> {
    try {
      const uploadPath = buildUploadPath(file, this.config.folder);
      const metadata = this.createMetadata(file);
      const content = this.getFileContent(file);

      // Call putObject - size is optional (MinIO can calculate automatically)
      // This matches the behavior of the old code that didn't pass size
      // MinIO v7.1.1 signature: putObject(bucketName, objectName, stream, size?, metaData?)
      // We need to handle the optional size parameter correctly for TypeScript
      if (file.size && file.size > 0) {
        // Pass size if valid
        await this.client.putObject(
          this.config.bucket,
          uploadPath,
          content,
          file.size,
          metadata
        );
      } else {
        // Don't pass size - MinIO will calculate automatically (like old code)
        // Cast to any to handle optional size parameter in TypeScript
        await (this.client.putObject as any)(
          this.config.bucket,
          uploadPath,
          content,
          metadata
        );
      }

      file.url = createFileUrl(uploadPath, this.hostUrl, this.config.bucket);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorDetails: Record<string, unknown> = {
        fileName: file.name,
        fileSize: file.size,
        bucket: this.config.bucket,
        endpoint: this.config.endPoint,
        port: this.config.port,
      };

      // Add more context for connection/timeout errors
      if (
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("connect")
      ) {
        errorDetails.suggestion =
          `Connection error to MinIO at ${this.config.endPoint}:${this.config.port}. ` +
          `Please check: 1) MinIO server is running and accessible, 2) Network connectivity, ` +
          `3) Firewall rules, 4) Connection timeout settings.`;
        errorDetails.errorType = "ConnectionError";
      } else if (
        errorMessage.includes("bucket") ||
        errorMessage.includes("Bucket") ||
        errorMessage.includes("NoSuchBucket")
      ) {
        errorDetails.suggestion =
          `Make sure the bucket "${this.config.bucket}" exists and is accessible.`;
        errorDetails.errorType = "BucketError";
      }

      throw new UploadError(errorMessage, errorDetails);
    }
  }


  /**
   * Deletes a file from MinIO
   */
  public async delete(file: StrapiFile): Promise<void> {
    try {
      if (!file.url) {
        throw new Error("File URL is required for deletion");
      }

      const filePath = extractFilePathFromUrl(
        file.url,
        this.hostUrl,
        this.config.bucket
      );

      await this.client.removeObject(this.config.bucket, filePath);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorDetails: Record<string, unknown> = {
        fileUrl: file.url,
        bucket: this.config.bucket,
      };

      // Add more context for common delete errors
      if (errorMessage.includes("NoSuchKey") || errorMessage.includes("not found")) {
        errorDetails.suggestion = "The file may have already been deleted or never existed.";
      } else if (errorMessage.includes("Access Denied") || errorMessage.includes("Forbidden")) {
        errorDetails.suggestion = "Check your MinIO access key and secret key permissions.";
      }

      throw new DeleteError(errorMessage, errorDetails);
    }
  }

  /**
   * Checks if the provider is configured for private files
   */
  public isPrivate(): boolean {
    return this.config.private;
  }

  /**
   * Generates a signed URL for a file
   * This method is more tolerant and will attempt to generate signed URLs for legacy files
   * even when the endpoint doesn't match exactly, as long as the bucket is detected in the pathname
   */
  public async getSignedUrl(
    file: StrapiFile,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse> {
    if (!file.url) {
      throw new SignedUrlError("File URL is required for signed URL generation", {
        fileName: file.name,
      });
    }

    // Check if URL is already signed (contains query parameters from presigned URL)
    // If it's already signed, we can return it as-is or regenerate it
    const isAlreadySigned = file.url.includes("X-Amz-Algorithm") || 
                            file.url.includes("signature=");

    // Primary check: verify if file is from the same bucket
    const isFromSameBucket = isFileFromSameBucket(
      file.url,
      this.config.endPoint,
      this.config.bucket
    );

    // Fallback check: verify if pathname contains the bucket (for legacy URLs)
    const pathnameHasBucket = pathnameContainsBucket(file.url, this.config.bucket);

    // If file is not from the same bucket and pathname doesn't contain bucket, return original URL
    if (!isFromSameBucket && !pathnameHasBucket) {
      this.logger.debug(
        `[strapi-provider-upload-minio] File URL does not belong to bucket "${this.config.bucket}": ${file.url}`
      );
      return { url: file.url };
    }

    // If URL is already signed and no custom expiry is requested, return as-is
    // This avoids unnecessary regeneration of signed URLs
    if (isAlreadySigned && options?.expiresIn === undefined) {
      return { url: file.url };
    }

    try {
      // Attempt to extract file path - this will work even if hostUrl doesn't match exactly
      let filePath: string;
      try {
        filePath = extractFilePathFromUrl(
          file.url,
          this.hostUrl,
          this.config.bucket
        );
      } catch (extractError) {
        // If extraction fails with hostUrl, try to extract from pathname directly
        this.logger.debug(
          `[strapi-provider-upload-minio] Failed to extract path with hostUrl, trying pathname extraction: ${extractError instanceof Error ? extractError.message : String(extractError)}`
        );
        
        try {
          const urlObj = new URL(file.url);
          const pathname = urlObj.pathname;
          
          // Remove leading slash and bucket from pathname
          if (pathname.startsWith(`/${this.config.bucket}/`)) {
            filePath = pathname.substring(`/${this.config.bucket}/`.length);
          } else if (pathname.startsWith(`/${this.config.bucket}`)) {
            filePath = pathname.substring(`/${this.config.bucket}`.length).replace(/^\//, "");
          } else {
            throw new Error("Could not extract file path from pathname");
          }
        } catch (pathnameError) {
          // If all extraction methods fail, log and return original URL
          this.logger.warn(
            `[strapi-provider-upload-minio] Could not extract file path from URL: ${file.url}. Error: ${pathnameError instanceof Error ? pathnameError.message : String(pathnameError)}`
          );
          return { url: file.url };
        }
      }

      // Use custom expiry if provided, otherwise use config default
      const expiry = options?.expiresIn || this.config.expiry;

      // Validate expiry
      if (expiry <= 0 || !Number.isInteger(expiry)) {
        throw new SignedUrlError(
          "expiresIn must be a positive integer (seconds)",
          { provided: expiry }
        );
      }

      const presignedUrl = await this.client.presignedGetObject(
        this.config.bucket,
        filePath,
        expiry
      );

      return { url: presignedUrl };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorDetails: Record<string, unknown> = {
        fileUrl: file.url,
        bucket: this.config.bucket,
        expiresIn: options?.expiresIn,
      };

      // Add more context for common signed URL errors
      if (errorMessage.includes("Access Denied") || errorMessage.includes("Forbidden")) {
        errorDetails.suggestion = "Check your MinIO access key and secret key permissions for signed URL generation.";
      } else if (errorMessage.includes("NoSuchKey") || errorMessage.includes("not found")) {
        errorDetails.suggestion = "The file may not exist in the bucket.";
      }

      // Log the error but don't throw - return original URL as fallback for legacy files
      this.logger.warn(
        `[strapi-provider-upload-minio] Failed to generate signed URL for file: ${file.url}. Error: ${errorMessage}. Returning original URL as fallback.`
      );

      // For legacy files, return original URL instead of throwing error
      // This ensures backward compatibility
      if (pathnameHasBucket && !isFromSameBucket) {
        this.logger.debug(
          `[strapi-provider-upload-minio] Legacy file detected, returning original URL as fallback`
        );
        return { url: file.url };
      }

      throw new SignedUrlError(errorMessage, errorDetails);
    }
  }

  /**
   * Creates metadata for file upload
   * Includes Strapi file metadata like alternativeText, caption, etc.
   */
  private createMetadata(file: StrapiFile): Record<string, string> {
    const contentType = getMimeType(file.ext) || DEFAULT_MIME_TYPE;
    const metadata: Record<string, string> = {
      "Content-Type": contentType,
    };

    // Add Strapi-specific metadata if available
    if (file.alternativeText) {
      metadata["X-Strapi-Alternative-Text"] = file.alternativeText;
    }

    if (file.caption) {
      metadata["X-Strapi-Caption"] = file.caption;
    }

    if (file.name) {
      metadata["X-Strapi-Name"] = file.name;
    }

    // Add custom metadata from file.metadata if provided
    if (file.metadata) {
      Object.entries(file.metadata).forEach(([key, value]) => {
        if (typeof value === "string") {
          // Prefix custom metadata keys to avoid conflicts
          metadata[`X-Strapi-Metadata-${key}`] = value;
        }
      });
    }

    return metadata;
  }

  /**
   * Gets file content as stream or buffer
   * Matches the behavior of the old code: file.stream || Buffer.from(file.buffer, 'binary')
   * In Strapi, file.buffer is typically already a Buffer, but we ensure compatibility
   */
  private getFileContent(file: StrapiFile): Readable | Buffer {
    if (file.stream) {
      return file.stream;
    }

    if (file.buffer) {
      // If buffer is already a Buffer instance, return it directly
      // Otherwise convert it (matching old code behavior)
      if (Buffer.isBuffer(file.buffer)) {
        return file.buffer;
      }
      // Fallback: convert if it's not a Buffer (shouldn't happen in Strapi, but for safety)
      return Buffer.from(file.buffer as any, 'binary');
    }

    throw new UploadError("File must have either stream or buffer property", {
      fileName: file.name,
    });
  }
}

