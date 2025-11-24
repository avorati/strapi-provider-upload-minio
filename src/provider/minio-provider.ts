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
      // Check bucket existence before upload (non-blocking warning only)
      await this.checkBucketExistsSilently();

      const uploadPath = buildUploadPath(file, this.config.folder);
      const metadata = this.createMetadata(file);
      const content = this.getFileContent(file);

      await this.client.putObject(
        this.config.bucket,
        uploadPath,
        content,
        file.size,
        metadata
      );

      file.url = createFileUrl(uploadPath, this.hostUrl, this.config.bucket);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorDetails: Record<string, unknown> = {
        fileName: file.name,
        fileSize: file.size,
        bucket: this.config.bucket,
      };

      // Add more context if it's a bucket-related error
      if (
        errorMessage.includes("bucket") ||
        errorMessage.includes("Bucket") ||
        errorMessage.includes("NoSuchBucket")
      ) {
        errorDetails.suggestion =
          `Make sure the bucket "${this.config.bucket}" exists and is accessible.`;
      }

      throw new UploadError(errorMessage, errorDetails);
    }
  }

  /**
   * Checks bucket existence silently (only logs warnings if bucket doesn't exist, never throws)
   * Errors are silently ignored since we already warned during initialization
   */
  private async checkBucketExistsSilently(): Promise<void> {
    await this.checkBucketExists(true);
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

    // If file is not from the same bucket, return the original URL
    if (
      !isFileFromSameBucket(file.url, this.config.endPoint, this.config.bucket)
    ) {
      return { url: file.url };
    }

    try {
      const filePath = extractFilePathFromUrl(
        file.url,
        this.hostUrl,
        this.config.bucket
      );

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
   */
  private getFileContent(file: StrapiFile): Readable | Buffer {
    if (file.stream) {
      return file.stream;
    }

    if (file.buffer) {
      return file.buffer;
    }

    throw new UploadError("File must have either stream or buffer property", {
      fileName: file.name,
    });
  }
}

