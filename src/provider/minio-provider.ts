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

const DEFAULT_MIME_TYPE = "application/octet-stream";

/**
 * MinIO provider for Strapi upload plugin
 */
export class MinioProvider implements StrapiProvider {
  private readonly client: MinioClient;
  private readonly config: NormalizedConfig;
  private readonly hostUrl: string;

  constructor(config: NormalizedConfig) {
    this.config = config;
    this.client = createMinioClient(config);
    this.hostUrl = buildHostUrl(config);
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
   * Checks if the bucket exists and logs a warning if it doesn't
   * This method never throws errors to avoid breaking Strapi initialization
   */
  private async checkBucketExists(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.config.bucket);
      if (!exists) {
        console.warn(
          `[strapi-provider-upload-minio] Warning: Bucket "${this.config.bucket}" does not exist. ` +
            `Please create it before uploading files. Uploads will fail until the bucket is created.`
        );
      }
    } catch (error) {
      // Only log warning, never throw - we don't want to break Strapi
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[strapi-provider-upload-minio] Warning: Could not verify bucket "${this.config.bucket}" existence: ${errorMessage}. ` +
          `This may indicate a connection issue with MinIO. Uploads may fail.`
      );
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
   * Checks bucket existence silently (only logs warnings, never throws)
   */
  private async checkBucketExistsSilently(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.config.bucket);
      if (!exists) {
        console.warn(
          `[strapi-provider-upload-minio] Warning: Bucket "${this.config.bucket}" does not exist. ` +
            `Upload will fail. Please create the bucket first.`
        );
      }
    } catch (error) {
      // Silently ignore - we already warned during initialization
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

