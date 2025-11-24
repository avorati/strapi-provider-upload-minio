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
    
    // Log initialization details if debug is enabled
    if (this.logger.isDebugEnabled && this.logger.isDebugEnabled()) {
      const safeConfig = {
        endPoint: config.endPoint,
        port: config.port,
        useSSL: config.useSSL,
        accessKey: config.accessKey.substring(0, 4) + "***",
        secretKey: "***",
        bucket: config.bucket,
        folder: config.folder || "(empty)",
        private: config.private,
        expiry: config.expiry,
        connectTimeout: config.connectTimeout,
        hostUrl: this.hostUrl,
      };
      this.logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] Initializing MinIO client with config:`,
        JSON.stringify(safeConfig, null, 2)
      );
    }
    
    // Check bucket existence asynchronously without blocking initialization
    // Use process.nextTick to avoid blocking and ensure it runs after constructor
    // Only check if not in test environment to avoid test warnings
    if (process.env.NODE_ENV !== "test") {
      process.nextTick(() => {
        this.checkBucketExists().catch((error) => {
          // Log connection test error for debugging
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes("signature") || errorMsg.includes("Signature")) {
            console.error(`[MINIO-CONNECTION-TEST] Signature error during bucket check:`, errorMsg);
            console.error(`[MINIO-CONNECTION-TEST] This suggests credentials mismatch. AccessKey: ${config.accessKey.substring(0, 8)}..., Endpoint: ${config.endPoint}:${config.port}`);
          }
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
    const startTime = Date.now();
    const isDebugEnabled = this.logger.isDebugEnabled && this.logger.isDebugEnabled();
    
    if (isDebugEnabled) {
      this.logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] Checking bucket existence: bucket="${this.config.bucket}", useCache=${useCache}, silent=${silent}`
      );
    }
    
    // Check cache first if enabled
    if (useCache && this.isBucketCheckCacheValid()) {
      const cached = this.bucketCheckCache!;
      const cacheAge = Date.now() - cached.timestamp;
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Using cached bucket check result: exists=${cached.exists}, cacheAge=${cacheAge}ms`
        );
      }
      
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
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Calling bucketExists API for bucket: "${this.config.bucket}"`
        );
      }
      
      const exists = await this.client.bucketExists(this.config.bucket);
      const duration = Date.now() - startTime;
      
      // Update cache
      this.bucketCheckCache = {
        exists,
        timestamp: Date.now(),
      };

      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Bucket check completed in ${duration}ms: exists=${exists}, bucket="${this.config.bucket}"`
        );
      }

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
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Bucket check failed in ${duration}ms: error="${errorMessage}", bucket="${this.config.bucket}"`
        );
      }
      
      // Only log warning if not silent - we don't want to break Strapi
      // silent controls error logging (connection issues, etc.)
      if (!silent) {
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
    const startTime = Date.now();
    const isDebugEnabled = this.logger.isDebugEnabled && this.logger.isDebugEnabled();
    
    if (isDebugEnabled) {
      this.logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] Starting upload: file="${file.name}", size=${file.size}, mime="${file.mime}", ext="${file.ext}", bucket="${this.config.bucket}"`
      );
    }
    
    try {
      const uploadPath = buildUploadPath(file, this.config.folder);
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Upload path generated: "${uploadPath}", folder="${this.config.folder || "(empty)"}", fileName="${file.name}", hash="${file.hash}", ext="${file.ext}"`
        );
      }
      
      const metadata = this.createMetadata(file);
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Metadata created:`,
          JSON.stringify(metadata, null, 2)
        );
      }
      
      const content = this.getFileContent(file);
      const contentType = file.stream ? "stream" : "buffer";
      const contentSize = file.stream ? "unknown" : (file.buffer && Buffer.isBuffer(file.buffer) ? file.buffer.length : "unknown");
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] File content type: ${contentType}, contentSize=${contentSize}, fileSize=${file.size}`
        );
      }

      // Call putObject - size is optional (MinIO can calculate automatically)
      // This matches the behavior of the old code that didn't pass size
      // MinIO v8.0.6 signature: putObject(bucketName, objectName, stream, size?, metaData?)
      // We need to handle the optional size parameter correctly for TypeScript
      const uploadStartTime = Date.now();
      
      // Ensure path is properly normalized (no encoding issues)
      // MinIO client should handle encoding, but we ensure clean path
      const normalizedUploadPath = uploadPath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
      
      // Calculate path in bytes (UTF-8) for MinIO limits
      const pathBytes = Buffer.from(normalizedUploadPath, 'utf8').length;
      const pathBytesFull = Buffer.from(`/${this.config.bucket}/${normalizedUploadPath}`, 'utf8').length;
      
      // Always log critical info before upload attempt (even without debug)
      const criticalInfo = {
        bucket: this.config.bucket,
        objectName: normalizedUploadPath,
        objectNameLength: normalizedUploadPath.length,
        objectNameBytes: pathBytes,
        fullPathBytes: pathBytesFull,
        originalHash: file.hash,
        originalHashLength: file.hash.length,
        fileSize: file.size,
        endpoint: `${this.config.endPoint}:${this.config.port}`,
        useSSL: this.config.useSSL,
        accessKeyLength: this.config.accessKey.length,
        accessKeyPrefix: this.config.accessKey.substring(0, 8),
        secretKeyLength: this.config.secretKey.length,
        metadataCount: Object.keys(metadata).length,
        metadataKeys: Object.keys(metadata),
      };
      
      // Always show critical info (info level, not debug)
      console.log(`[MINIO-UPLOAD] Starting upload:`, JSON.stringify(criticalInfo, null, 2));
      this.logger.info(
        `[strapi-provider-upload-minio] Upload attempt: bucket="${this.config.bucket}", objectName="${normalizedUploadPath}" (${pathBytes} bytes), hash="${file.hash.substring(0, 40)}..."`
      );
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] ========== PUTOBJECT REQUEST DETAILS ==========`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Critical Info:`,
          JSON.stringify(criticalInfo, null, 2)
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Bucket: "${this.config.bucket}"`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Object Name: "${normalizedUploadPath}"`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Path Length: ${normalizedUploadPath.length} chars, ${pathBytes} bytes`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Full Path (with bucket): ${pathBytesFull} bytes`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Original Hash: "${file.hash}" (${file.hash.length} chars)`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] File Size: ${file.size} bytes`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Content Type: ${contentType}`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Content Size: ${contentSize}`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Endpoint: ${this.config.endPoint}:${this.config.port} (SSL: ${this.config.useSSL})`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Access Key: ${this.config.accessKey.substring(0, 8)}... (length: ${this.config.accessKey.length})`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Secret Key Length: ${this.config.secretKey.length} chars`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Metadata Keys (${Object.keys(metadata).length}):`,
          JSON.stringify(Object.keys(metadata), null, 2)
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Full Metadata:`,
          JSON.stringify(metadata, null, 2)
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Path Encoding Check:`,
          JSON.stringify({
            original: uploadPath,
            normalized: normalizedUploadPath,
            changed: uploadPath !== normalizedUploadPath,
            utf8Bytes: pathBytes,
            encoded: encodeURIComponent(normalizedUploadPath),
            encodedBytes: Buffer.from(encodeURIComponent(normalizedUploadPath), 'utf8').length,
          }, null, 2)
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] ================================================`
        );
      }
      
      // Test credentials before upload by trying to list bucket (quick test)
      // This helps identify credential issues early
      try {
        if (isDebugEnabled) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Testing credentials with bucketExists check...`
          );
        }
        const bucketExists = await this.client.bucketExists(this.config.bucket);
        if (isDebugEnabled) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Credentials test passed. Bucket exists: ${bucketExists}`
          );
        }
      } catch (credTestError) {
        const credErrorMsg = credTestError instanceof Error ? credTestError.message : String(credTestError);
        const credErrorStack = credTestError instanceof Error ? credTestError.stack : undefined;
        const credErrorCode = (credTestError as any)?.code;
        const credErrorSyscall = (credTestError as any)?.syscall;
        const credErrorHostname = (credTestError as any)?.hostname;
        
        console.error(`[MINIO-CREDENTIALS-TEST] Failed before upload:`, credErrorMsg);
        console.error(`[MINIO-CREDENTIALS-TEST] Error code:`, credErrorCode);
        console.error(`[MINIO-CREDENTIALS-TEST] Error syscall:`, credErrorSyscall);
        console.error(`[MINIO-CREDENTIALS-TEST] Error hostname:`, credErrorHostname);
        if (credErrorStack) {
          console.error(`[MINIO-CREDENTIALS-TEST] Error stack:`, credErrorStack);
        }
        console.error(`[MINIO-CREDENTIALS-TEST] This may indicate credentials/endpoint mismatch, SSL certificate issues, or network connectivity problems!`);
        // Continue anyway - let putObject fail with more context
      }
      
      try {
        if (file.size && file.size > 0) {
          if (isDebugEnabled) {
            this.logger.debug(
              `[strapi-provider-upload-minio] [DEBUG] Calling putObject WITH size parameter: ${file.size}`
            );
          }
          await this.client.putObject(
            this.config.bucket,
            normalizedUploadPath,
            content,
            file.size,
            metadata
          );
          if (isDebugEnabled) {
            this.logger.debug(
              `[strapi-provider-upload-minio] [DEBUG] Upload succeeded`
            );
          }
        } else {
          if (isDebugEnabled) {
            this.logger.debug(
              `[strapi-provider-upload-minio] [DEBUG] Calling putObject WITHOUT size parameter`
            );
          }
          // Don't pass size - MinIO will calculate automatically (like old code)
          // Cast to any to handle optional size parameter in TypeScript
          await (this.client.putObject as any)(
            this.config.bucket,
            normalizedUploadPath,
            content,
            metadata
          );
          if (isDebugEnabled) {
            this.logger.debug(
              `[strapi-provider-upload-minio] [DEBUG] Upload succeeded`
            );
          }
        }

        // Ensure stream is completely closed after upload to prevent EBUSY errors on Windows
        // This is especially important when multiple uploads happen in parallel
        // (original, thumbnail, large, medium, small) sharing the same temporary file
        await this.ensureStreamClosed(content);
      } catch (putObjectError) {
        const putErrorMsg = putObjectError instanceof Error ? putObjectError.message : String(putObjectError);
        const putErrorStack = putObjectError instanceof Error ? putObjectError.stack : undefined;
        const putErrorCode = (putObjectError as any)?.code;
        const putErrorSyscall = (putObjectError as any)?.syscall;
        const putErrorHostname = (putObjectError as any)?.hostname;
        const putErrorErrno = (putObjectError as any)?.errno;
        
        // Always log error details (even without debug) - use console.log to ensure visibility
        const errorDetails = {
          bucket: this.config.bucket,
          objectName: normalizedUploadPath,
          objectNameLength: normalizedUploadPath.length,
          objectNameBytes: pathBytes,
          fullPathBytes: pathBytesFull,
          originalHash: file.hash,
          size: file.size || 'undefined',
          metadataCount: Object.keys(metadata).length,
          metadataKeys: Object.keys(metadata),
          endpoint: `${this.config.endPoint}:${this.config.port}`,
          accessKeyLength: this.config.accessKey.length,
          accessKeyPrefix: this.config.accessKey.substring(0, 8),
          secretKeyLength: this.config.secretKey.length,
          useSSL: this.config.useSSL,
          rejectUnauthorized: this.config.rejectUnauthorized,
          errorCode: putErrorCode,
          errorSyscall: putErrorSyscall,
          errorHostname: putErrorHostname,
          errorErrno: putErrorErrno,
        };
        console.error(`[MINIO-UPLOAD-ERROR] putObject failed:`, putErrorMsg);
        console.error(`[MINIO-UPLOAD-ERROR] Error code:`, putErrorCode);
        console.error(`[MINIO-UPLOAD-ERROR] Error syscall:`, putErrorSyscall);
        console.error(`[MINIO-UPLOAD-ERROR] Error hostname:`, putErrorHostname);
        if (putErrorStack) {
          console.error(`[MINIO-UPLOAD-ERROR] Error stack:`, putErrorStack);
        }
        console.error(`[MINIO-UPLOAD-ERROR] Request details:`, JSON.stringify(errorDetails, null, 2));
        this.logger.error(
          `[strapi-provider-upload-minio] PUTOBJECT ERROR: ${putErrorMsg}`
        );
        this.logger.error(
          `[strapi-provider-upload-minio] Failed upload details:`,
          JSON.stringify(errorDetails, null, 2)
        );
        
        if (isDebugEnabled) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] ========== PUTOBJECT ERROR DETAILS ==========`
          );
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Error Message: ${putErrorMsg}`
          );
          if (putErrorStack) {
            this.logger.debug(
              `[strapi-provider-upload-minio] [DEBUG] Error Stack: ${putErrorStack}`
            );
          }
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Parameters used:`,
            JSON.stringify({
              bucket: this.config.bucket,
              objectName: normalizedUploadPath,
              objectNameLength: normalizedUploadPath.length,
              objectNameBytes: pathBytes,
              size: file.size || 'undefined',
              hasMetadata: !!metadata,
              metadataCount: Object.keys(metadata).length,
              metadata: metadata,
            }, null, 2)
          );
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] ================================================`
          );
        }
        throw putObjectError;
      }
      
      const uploadDuration = Date.now() - uploadStartTime;
      const fileUrl = createFileUrl(normalizedUploadPath, this.hostUrl, this.config.bucket);
      file.url = fileUrl;
      const totalDuration = Date.now() - startTime;
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Upload completed successfully in ${totalDuration}ms (putObject: ${uploadDuration}ms): file="${file.name}", url="${fileUrl}"`
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // Get upload path for error details (might not be available if path building failed)
      let uploadPath: string | undefined;
      let normalizedUploadPath: string | undefined;
      let pathBytes: number | undefined;
      try {
        uploadPath = buildUploadPath(file, this.config.folder);
        normalizedUploadPath = uploadPath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
        pathBytes = Buffer.from(normalizedUploadPath, 'utf8').length;
      } catch {
        // Path building failed, will be handled separately
      }
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] ========== UPLOAD ERROR DETAILS ==========`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Upload failed in ${duration}ms`
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Error Message: "${errorMessage}"`
        );
        if (errorStack) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Error Stack: ${errorStack}`
          );
        }
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] File Info:`,
          JSON.stringify({
            fileName: file.name,
            fileNameLength: file.name?.length,
            fileHash: file.hash,
            fileHashLength: file.hash?.length,
            fileExtension: file.ext,
            fileSize: file.size,
            fileMime: file.mime,
          }, null, 2)
        );
        if (uploadPath) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Path Info:`,
            JSON.stringify({
              originalPath: uploadPath,
              normalizedPath: normalizedUploadPath,
              pathLength: normalizedUploadPath?.length,
              pathBytes: pathBytes,
              folder: this.config.folder,
            }, null, 2)
          );
        }
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Config Info:`,
          JSON.stringify({
            endpoint: this.config.endPoint,
            port: this.config.port,
            useSSL: this.config.useSSL,
            bucket: this.config.bucket,
            accessKeyLength: this.config.accessKey?.length,
            secretKeyLength: this.config.secretKey?.length,
            accessKeyPrefix: this.config.accessKey?.substring(0, 8),
          }, null, 2)
        );
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] ===========================================`
        );
      }

      const errorDetails: Record<string, unknown> = {
        fileName: file.name,
        fileHash: file.hash,
        fileExtension: file.ext,
        uploadPath: uploadPath || "(path building failed)",
        fileSize: file.size,
        bucket: this.config.bucket,
        endpoint: this.config.endPoint,
        port: this.config.port,
      };

      // Add more context for signature/authentication errors
      if (
        errorMessage.includes("signature") ||
        errorMessage.includes("Signature") ||
        errorMessage.includes("does not match") ||
        errorMessage.includes("InvalidAccessKeyId") ||
        errorMessage.includes("SignatureDoesNotMatch")
      ) {
        const accessKeyPrefix = this.config.accessKey.substring(0, Math.min(4, this.config.accessKey.length));
        const isLocalhost = this.config.endPoint === "localhost" || this.config.endPoint === "127.0.0.1";
        const isPlayMinIOCredentials = 
          this.config.accessKey === "Q3AM3UQ867SPQQA43P2F" || 
          this.config.accessKey.startsWith("Q3AM");
        
        let suggestion = `Signature mismatch error. This usually indicates incorrect credentials or endpoint mismatch. `;
        
        // Specific warning for Play.MinIO.io credentials with localhost
        if (isPlayMinIOCredentials && isLocalhost) {
          suggestion += `\n⚠️ WARNING: You're using Play.MinIO.io credentials (${accessKeyPrefix}***) with localhost endpoint. ` +
            `These credentials only work with play.min.io endpoint. ` +
            `For local MinIO, use credentials configured in your local MinIO instance (usually minioadmin/minioadmin). ` +
            `If you want to use Play.MinIO.io, change MINIO_ENDPOINT to play.min.io and MINIO_USE_SSL to true.`;
        } else {
          suggestion += `\nPlease verify: 1) MINIO_ACCESS_KEY matches your MinIO access key, ` +
            `2) MINIO_SECRET_KEY matches your MinIO secret key, ` +
            `3) Credentials are correctly set in your .env file, ` +
            `4) No extra whitespace or special characters in credentials, ` +
            `5) Endpoint matches the MinIO server you're connecting to. ` +
            `For MinIO running locally, default credentials are often minioadmin/minioadmin. ` +
            `Check your MinIO console at http${this.config.useSSL ? "s" : ""}://${this.config.endPoint}:${this.config.port === 9000 ? "9001" : this.config.port + 1} to verify credentials.`;
        }
        
        errorDetails.suggestion = suggestion;
        errorDetails.errorType = "SignatureError";
        errorDetails.accessKeyPrefix = accessKeyPrefix + "***";
        errorDetails.endpoint = this.config.endPoint;
        errorDetails.isLocalhost = isLocalhost;
        if (uploadPath) {
          errorDetails.uploadPath = uploadPath;
        }
      } else if (
        // Add more context for connection/timeout errors
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("connect") ||
        errorMessage.includes("ENOTFOUND") ||
        errorMessage.includes("ECONNREFUSED") ||
        (error as any)?.code === "ETIMEDOUT" ||
        (error as any)?.code === "ECONNRESET" ||
        (error as any)?.code === "ENOTFOUND" ||
        (error as any)?.code === "ECONNREFUSED"
      ) {
        const errorCode = (error as any)?.code;
        errorDetails.suggestion =
          `Connection error to MinIO at ${this.config.endPoint}:${this.config.port} (error code: ${errorCode || "unknown"}). ` +
          `Please check: 1) MinIO server is running and accessible, 2) Network connectivity from Strapi to MinIO, ` +
          `3) Firewall rules allowing connection, 4) Connection timeout settings (current: ${this.config.connectTimeout}ms), ` +
          `5) DNS resolution for ${this.config.endPoint}, 6) SSL/TLS configuration if useSSL=true.`;
        errorDetails.errorType = "ConnectionError";
        errorDetails.errorCode = errorCode;
      } else if (
        // SSL certificate errors
        errorMessage.includes("certificate") ||
        errorMessage.includes("CERT") ||
        errorMessage.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE") ||
        errorMessage.includes("SELF_SIGNED_CERT") ||
        (error as any)?.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
        (error as any)?.code === "SELF_SIGNED_CERT_IN_CHAIN" ||
        (error as any)?.code === "DEPTH_ZERO_SELF_SIGNED_CERT"
      ) {
        const errorCode = (error as any)?.code;
        errorDetails.suggestion =
          `SSL certificate error (error code: ${errorCode || "unknown"}). ` +
          `If using self-signed certificates in dev/hmg environments, set MINIO_REJECT_UNAUTHORIZED=false. ` +
          `⚠️ WARNING: This reduces security - only use in non-production environments!`;
        errorDetails.errorType = "SSLCertificateError";
        errorDetails.errorCode = errorCode;
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
    const startTime = Date.now();
    const isDebugEnabled = this.logger.isDebugEnabled && this.logger.isDebugEnabled();
    
    if (isDebugEnabled) {
      this.logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] Starting delete: fileUrl="${file.url}", fileName="${file.name}", bucket="${this.config.bucket}"`
      );
    }
    
    try {
      if (!file.url) {
        throw new Error("File URL is required for deletion");
      }

      const filePath = extractFilePathFromUrl(
        file.url,
        this.hostUrl,
        this.config.bucket
      );

      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Extracted file path: "${filePath}" from URL: "${file.url}"`
        );
      }

      const deleteStartTime = Date.now();
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Calling removeObject: bucket="${this.config.bucket}", objectName="${filePath}"`
        );
      }
      
      await this.client.removeObject(this.config.bucket, filePath);
      
      const deleteDuration = Date.now() - deleteStartTime;
      const totalDuration = Date.now() - startTime;
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Delete completed successfully in ${totalDuration}ms (removeObject: ${deleteDuration}ms): filePath="${filePath}"`
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Delete failed in ${duration}ms: fileUrl="${file.url}", error="${errorMessage}"`
        );
      }
      
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
    const startTime = Date.now();
    const isDebugEnabled = this.logger.isDebugEnabled && this.logger.isDebugEnabled();
    
    if (isDebugEnabled) {
      this.logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] Starting getSignedUrl: fileUrl="${file.url}", fileName="${file.name}", expiresIn=${options?.expiresIn || "default"}, bucket="${this.config.bucket}"`
      );
    }
    
    if (!file.url) {
      throw new SignedUrlError("File URL is required for signed URL generation", {
        fileName: file.name,
      });
    }

    // Check if URL is already signed (contains query parameters from presigned URL)
    // If it's already signed, we can return it as-is or regenerate it
    const isAlreadySigned = file.url.includes("X-Amz-Algorithm") || 
                            file.url.includes("signature=");

    if (isDebugEnabled) {
      this.logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] URL already signed: ${isAlreadySigned}`
      );
    }

    // Primary check: verify if file is from the same bucket
    const isFromSameBucket = isFileFromSameBucket(
      file.url,
      this.config.endPoint,
      this.config.bucket
    );

    // Fallback check: verify if pathname contains the bucket (for legacy URLs)
    const pathnameHasBucket = pathnameContainsBucket(file.url, this.config.bucket);

    if (isDebugEnabled) {
      this.logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] Bucket checks: isFromSameBucket=${isFromSameBucket}, pathnameHasBucket=${pathnameHasBucket}`
      );
    }

    // If file is not from the same bucket and pathname doesn't contain bucket, return original URL
    if (!isFromSameBucket && !pathnameHasBucket) {
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] File URL does not belong to bucket "${this.config.bucket}": ${file.url}, returning original URL`
        );
      } else {
        this.logger.debug(
          `[strapi-provider-upload-minio] File URL does not belong to bucket "${this.config.bucket}": ${file.url}`
        );
      }
      return { url: file.url };
    }

    // If URL is already signed and no custom expiry is requested, return as-is
    // This avoids unnecessary regeneration of signed URLs
    if (isAlreadySigned && options?.expiresIn === undefined) {
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] URL already signed and no custom expiry requested, returning as-is`
        );
      }
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
        
        if (isDebugEnabled) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Extracted file path using hostUrl: "${filePath}"`
          );
        }
      } catch (extractError) {
        // If extraction fails with hostUrl, try to extract from pathname directly
        if (isDebugEnabled) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Failed to extract path with hostUrl, trying pathname extraction: ${extractError instanceof Error ? extractError.message : String(extractError)}`
          );
        } else {
          this.logger.debug(
            `[strapi-provider-upload-minio] Failed to extract path with hostUrl, trying pathname extraction: ${extractError instanceof Error ? extractError.message : String(extractError)}`
          );
        }
        
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
          
          if (isDebugEnabled) {
            this.logger.debug(
              `[strapi-provider-upload-minio] [DEBUG] Extracted file path using pathname: "${filePath}"`
            );
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

      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Using expiry: ${expiry} seconds (${options?.expiresIn ? "custom" : "default"})`
        );
      }

      // Validate expiry
      if (expiry <= 0 || !Number.isInteger(expiry)) {
        throw new SignedUrlError(
          "expiresIn must be a positive integer (seconds)",
          { provided: expiry }
        );
      }

      const presignStartTime = Date.now();
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Calling presignedGetObject: bucket="${this.config.bucket}", objectName="${filePath}", expiry=${expiry}`
        );
      }

      const presignedUrl = await this.client.presignedGetObject(
        this.config.bucket,
        filePath,
        expiry
      );

      const presignDuration = Date.now() - presignStartTime;
      const totalDuration = Date.now() - startTime;
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Signed URL generated successfully in ${totalDuration}ms (presignedGetObject: ${presignDuration}ms): url="${presignedUrl.substring(0, 100)}..."`
        );
      }

      return { url: presignedUrl };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Signed URL generation failed in ${duration}ms: fileUrl="${file.url}", error="${errorMessage}"`
        );
      }
      
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
        if (isDebugEnabled) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Legacy file detected, returning original URL as fallback`
          );
        } else {
          this.logger.debug(
            `[strapi-provider-upload-minio] Legacy file detected, returning original URL as fallback`
          );
        }
        return { url: file.url };
      }

      throw new SignedUrlError(errorMessage, errorDetails);
    }
  }

  /**
   * Creates metadata for file upload
   * Returns only Content-Type to maintain security signature
   */
  private createMetadata(file: StrapiFile): Record<string, string> {
    const contentType = getMimeType(file.ext) || DEFAULT_MIME_TYPE;
    const metadata: Record<string, string> = {
      "Content-Type": contentType,
    };

    const isDebugEnabled = this.logger.isDebugEnabled && this.logger.isDebugEnabled();
    if (isDebugEnabled) {
      this.logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] Created metadata: contentType="${contentType}"`
      );
    }

    return metadata;
  }

  /**
   * Gets file content as stream or buffer
   * Matches the behavior of the old code: file.stream || Buffer.from(file.buffer, 'binary')
   * In Strapi, file.buffer is typically already a Buffer, but we ensure compatibility
   */
  private getFileContent(file: StrapiFile): Readable | Buffer {
    const isDebugEnabled = this.logger.isDebugEnabled && this.logger.isDebugEnabled();
    
    if (file.stream) {
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Using file stream for content, fileSize=${file.size}`
        );
      }
      return file.stream;
    }

    if (file.buffer) {
      // If buffer is already a Buffer instance, return it directly
      // Otherwise convert it (matching old code behavior)
      const buffer = Buffer.isBuffer(file.buffer) 
        ? file.buffer 
        : Buffer.from(file.buffer as any, 'binary');
      
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Using file buffer for content: bufferSize=${buffer.length}, fileSize=${file.size}, isBuffer=${Buffer.isBuffer(file.buffer)}`
        );
      }
      
      return buffer;
    }

    throw new UploadError("File must have either stream or buffer property", {
      fileName: file.name,
    });
  }

  /**
   * Ensures a stream is completely consumed and closed
   * This prevents EBUSY errors on Windows when Strapi tries to clean up temporary files
   * after parallel uploads (original, thumbnail, large, medium, small)
   * 
   * @param stream The stream to ensure is closed (if it is a Readable stream)
   * @param timeoutMs Optional timeout in milliseconds (default: 30000ms / 30 seconds)
   */
  private async ensureStreamClosed(stream: Readable | Buffer, timeoutMs: number = 30000): Promise<void> {
    // If it's not a stream, nothing to do
    if (!(stream instanceof Readable)) {
      return;
    }

    const isDebugEnabled = this.logger.isDebugEnabled && this.logger.isDebugEnabled();
    const isWindows = process.platform === 'win32';
    
    // Check if stream is already ended/closed
    if (stream.readableEnded || stream.destroyed) {
      if (isDebugEnabled) {
        this.logger.debug(
          `[strapi-provider-upload-minio] [DEBUG] Stream already ended or destroyed, no action needed`
        );
      }
      return;
    }

    if (isDebugEnabled) {
      this.logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] Ensuring stream is closed (Windows: ${isWindows})`
      );
    }

    return new Promise<void>((resolve) => {
      let resolved = false;
      let timeoutHandle: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        // Remove listeners to prevent memory leaks
        stream.removeListener('end', onEnd);
        stream.removeListener('error', onError);
        stream.removeListener('close', onClose);
      };

      const onEnd = () => {
        if (isDebugEnabled) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Stream ended, closing stream`
          );
        }

        // Try to close/destroy the stream explicitly
        try {
          // If stream has a close method (like fs.ReadStream), try to close it
          if (typeof (stream as any).close === 'function') {
            (stream as any).close();
          }
          // Destroy the stream to release file handles
          if (!stream.destroyed) {
            stream.destroy();
          }
        } catch (err) {
          // Silently ignore errors (stream might already be closed)
          if (isDebugEnabled) {
            const errMsg = err instanceof Error ? err.message : String(err);
            this.logger.debug(
              `[strapi-provider-upload-minio] [DEBUG] Error closing stream (ignored): ${errMsg}`
            );
          }
        }

        cleanup();
        
        // On Windows, add a small delay to ensure file handles are released
        if (isWindows) {
          // Small delay to allow Windows to release file handles
          setTimeout(() => {
            if (isDebugEnabled) {
              this.logger.debug(
                `[strapi-provider-upload-minio] [DEBUG] Stream closed, Windows file handle should be released`
              );
            }
            resolve();
          }, 10);
        } else {
          resolve();
        }
      };

      const onClose = () => {
        if (isDebugEnabled) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Stream closed event received`
          );
        }
        cleanup();
        resolve();
      };

      const onError = (error: Error) => {
        if (isDebugEnabled) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Stream error (ignored for cleanup): ${error.message}`
          );
        }
        // Try to clean up anyway
        cleanup();
        resolve(); // Resolve instead of reject - we want cleanup to complete
      };

      // Set up timeout to prevent hanging
      timeoutHandle = setTimeout(() => {
        if (isDebugEnabled) {
          this.logger.debug(
            `[strapi-provider-upload-minio] [DEBUG] Stream close timeout after ${timeoutMs}ms, forcing cleanup`
          );
        }
        
        // Force cleanup
        try {
          if (!stream.destroyed) {
            stream.destroy();
          }
        } catch (err) {
          // Ignore errors
        }
        
        cleanup();
        resolve(); // Resolve instead of reject - we want cleanup to complete
      }, timeoutMs);

      // Listen for stream events
      stream.once('end', onEnd);
      stream.once('close', onClose);
      stream.once('error', onError);

      // If stream is already ended, trigger cleanup immediately
      if (stream.readableEnded) {
        onEnd();
      } else if (stream.destroyed) {
        onClose();
      } else {
        // If stream hasn't ended, try to consume any remaining data
        // This helps ensure the stream completes
        stream.resume();
      }
    });
  }
}

