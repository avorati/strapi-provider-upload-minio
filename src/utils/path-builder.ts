import { StrapiFile } from "../index.types";
import { PathTraversalError } from "../errors/provider-errors";
import { createHash } from "crypto";

/**
 * Maximum length for hash in object key to avoid signature issues
 * S3/MinIO supports up to 1024 bytes, but practical limits are lower
 * Using 48 chars for hash (before extension) should be safe
 * This leaves room for folder path and extension
 */
const MAX_HASH_LENGTH = 48;

/**
 * Maximum total path length (folder + hash + extension)
 * Keeping well below 1024 byte limit to avoid signature calculation issues
 */
const MAX_TOTAL_PATH_LENGTH = 256;

/**
 * Creates a shorter, deterministic hash from a long hash
 * Uses MD5 to create a consistent short hash that preserves uniqueness
 * This prevents signature errors with very long object keys
 */
function createShortHash(longHash: string, maxLength: number = MAX_HASH_LENGTH): string {
  if (!longHash || longHash.length <= maxLength) {
    return longHash;
  }
  
  // Use MD5 to create a deterministic short hash
  // MD5 produces 32 hex characters, we'll take what we need
  const md5Hash = createHash('md5').update(longHash).digest('hex');
  
  // Take prefix from original hash and suffix from MD5 for better uniqueness
  // Strategy: Keep first part of original + MD5 hash (deterministic)
  const prefixLength = Math.max(8, Math.min(24, maxLength - 16));
  const suffixFromOriginal = longHash.substring(longHash.length - 8); // Last 8 chars of original
  const suffixFromMD5 = md5Hash.substring(0, maxLength - prefixLength - 8);
  
  return longHash.substring(0, prefixLength) + suffixFromMD5 + suffixFromOriginal;
}

/**
 * Sanitizes a path segment to prevent path traversal attacks
 * Removes dangerous characters and normalizes the path
 */
function sanitizePathSegment(segment: string): string {
  if (!segment || typeof segment !== "string") {
    return "";
  }

  // Remove leading/trailing whitespace
  let sanitized = segment.trim();

  // Remove null bytes and control characters first (before other checks)
  sanitized = sanitized.replace(/\0/g, "").replace(/[\x00-\x1F\x7F]/g, "");

  // Remove any path traversal attempts
  if (
    sanitized.includes("..") ||
    sanitized.includes("~") ||
    sanitized.startsWith("/") ||
    sanitized.startsWith("\\")
  ) {
    throw new PathTraversalError(
      `Path segment contains invalid characters or path traversal attempt: ${segment}`,
      { segment }
    );
  }

  // Normalize path separators (remove double slashes, backslashes)
  sanitized = sanitized.replace(/[\\\/]+/g, "/");

  return sanitized;
}

/**
 * Normalizes and sanitizes a complete path
 */
function normalizePath(path: string): string {
  if (!path) {
    return "";
  }

  // Split by any path separator and sanitize each segment
  const segments = path
    .split(/[\/\\]+/)
    .map((seg) => sanitizePathSegment(seg))
    .filter((seg) => seg.length > 0);

  return segments.join("/");
}

/**
 * Builds the upload path for a file in MinIO
 * Sanitizes all path components to prevent path traversal attacks
 */
export function buildUploadPath(
  file: StrapiFile,
  folder: string
): string {
  const pathSegments: string[] = [];

  // Sanitize and add folder if provided
  if (folder) {
    // Check for absolute paths before normalization
    const trimmedFolder = folder.trim();
    if (trimmedFolder.startsWith("/") || trimmedFolder.startsWith("\\")) {
      throw new PathTraversalError(
        `Folder path cannot be absolute: ${folder}`,
        { folder }
      );
    }
    const sanitizedFolder = normalizePath(folder);
    if (sanitizedFolder) {
      pathSegments.push(sanitizedFolder);
    }
  }

  // Sanitize and add file path if provided
  if (file.path) {
    // Check for absolute paths before normalization
    const trimmedPath = file.path.trim();
    if (trimmedPath.startsWith("/") || trimmedPath.startsWith("\\")) {
      throw new PathTraversalError(
        `File path cannot be absolute: ${file.path}`,
        { filePath: file.path }
      );
    }
    const sanitizedPath = normalizePath(file.path);
    if (sanitizedPath) {
      pathSegments.push(sanitizedPath);
    }
  }

  // Validate and sanitize hash and extension
  if (!file.hash || typeof file.hash !== "string") {
    throw new PathTraversalError("File hash is required and must be a string", {
      fileName: file.name,
    });
  }

  if (!file.ext || typeof file.ext !== "string") {
    throw new PathTraversalError(
      "File extension is required and must be a string",
      { fileName: file.name }
    );
  }

  // Sanitize hash (should not contain path separators)
  const originalHash = file.hash;
  let sanitizedHash = sanitizePathSegment(file.hash);
  const hashChanged = originalHash !== sanitizedHash;
  
  // Create shorter hash if it's too long to prevent signature errors with long object keys
  // Uses deterministic hashing to maintain uniqueness
  const hashBeforeShorten = sanitizedHash;
  sanitizedHash = createShortHash(sanitizedHash, MAX_HASH_LENGTH);
  const hashShortened = hashBeforeShorten !== sanitizedHash;
  
  // Sanitize extension (should start with . and not contain path separators)
  const sanitizedExt = file.ext.startsWith(".")
    ? sanitizePathSegment(file.ext.slice(1))
    : sanitizePathSegment(file.ext);

  if (!sanitizedExt) {
    throw new PathTraversalError("Invalid file extension", {
      fileName: file.name,
      ext: file.ext,
    });
  }

  pathSegments.push(`${sanitizedHash}.${sanitizedExt}`);

  // Join path segments (already sanitized individually)
  const fullPath = pathSegments.join("/");
  const fullPathBytes = Buffer.from(fullPath, 'utf8').length;
  
  // Final safety check: if path is still too long, truncate hash more aggressively
  let finalPath = fullPath;
  let pathTruncated = false;
  if (fullPath.length > MAX_TOTAL_PATH_LENGTH) {
    pathTruncated = true;
    const folderPath = pathSegments.slice(0, -1).join("/");
    const folderPathLength = folderPath ? folderPath.length + 1 : 0; // +1 for slash
    const extensionLength = sanitizedExt.length + 1; // +1 for dot
    const remainingLength = MAX_TOTAL_PATH_LENGTH - folderPathLength - extensionLength;
    
    if (remainingLength > 0) {
      // Create shorter hash to fit within total path limit
      const shortenedHash = createShortHash(sanitizedHash, remainingLength);
      finalPath = folderPath ? `${folderPath}/${shortenedHash}.${sanitizedExt}` : `${shortenedHash}.${sanitizedExt}`;
    }
  }
  
  // Debug logging if enabled (check via environment variable)
  if (process.env.MINIO_DEBUG === 'true' || process.env.MINIO_DEBUG === '1') {
    const logger = require('../utils/logger').getLogger();
    if (logger && logger.debug) {
      logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] Path building details:`,
        JSON.stringify({
          originalHash,
          originalHashLength: originalHash.length,
          sanitizedHash,
          sanitizedHashLength: sanitizedHash.length,
          hashChanged,
          hashShortened,
          extension: file.ext,
          sanitizedExt,
          folder,
          folderLength: folder?.length || 0,
          pathSegments: pathSegments.length,
          fullPath,
          fullPathLength: fullPath.length,
          fullPathBytes,
          finalPath,
          finalPathLength: finalPath.length,
          finalPathBytes: Buffer.from(finalPath, 'utf8').length,
          pathTruncated,
          maxTotalPathLength: MAX_TOTAL_PATH_LENGTH,
          maxHashLength: MAX_HASH_LENGTH,
        }, null, 2)
      );
    }
  }
  
  return finalPath;
}

/**
 * Extracts the file path from a MinIO URL
 * Removes query string parameters and URL fragments to get only the file path
 * This function is more tolerant and can extract paths even when hostUrl doesn't match exactly
 */
export function extractFilePathFromUrl(
  url: string,
  hostUrl: string,
  bucket: string
): string {
  if (!url) {
    throw new Error("File URL is required for path extraction");
  }

  // Decode URL-encoded characters (e.g., %3F becomes ?)
  let decodedUrl = decodeURIComponent(url);

  // Remove query string parameters (everything after ?)
  const queryIndex = decodedUrl.indexOf("?");
  if (queryIndex !== -1) {
    decodedUrl = decodedUrl.substring(0, queryIndex);
  }

  // Remove URL fragment (everything after #)
  const fragmentIndex = decodedUrl.indexOf("#");
  if (fragmentIndex !== -1) {
    decodedUrl = decodedUrl.substring(0, fragmentIndex);
  }

  try {
    // Try to parse as URL to get pathname
    const urlObj = new URL(decodedUrl);
    const pathname = urlObj.pathname;

    // Check if pathname starts with /{bucket}/
    if (pathname.startsWith(`/${bucket}/`)) {
      // Extract path after /{bucket}/
      return pathname.substring(`/${bucket}/`.length);
    } else if (pathname === `/${bucket}`) {
      // Edge case: pathname is exactly /{bucket}
      return "";
    }

    // Fallback: try to extract using hostUrl prefix (original method)
    const bucketPrefix = `${hostUrl}${bucket}/`;
    if (decodedUrl.startsWith(bucketPrefix)) {
      return decodedUrl.substring(bucketPrefix.length);
    }

    // If hostUrl doesn't match, try to extract from pathname directly
    // This handles cases where the URL has a different hostname
    // but the pathname structure is correct
    if (pathname.startsWith("/")) {
      // Remove leading slash and check if first segment is bucket
      const segments = pathname.substring(1).split("/");
      if (segments[0] === bucket && segments.length > 1) {
        // Return path after bucket
        return segments.slice(1).join("/");
      }
    }

    // Last resort: try simple string replacement
    const filePath = decodedUrl.replace(bucketPrefix, "");
    if (filePath !== decodedUrl) {
      return filePath;
    }

    // If all methods fail, throw error
    throw new Error(
      `Could not extract file path from URL. Expected bucket "${bucket}" in pathname.`
    );
  } catch (error) {
    // If URL parsing fails, fall back to simple string manipulation
    const bucketPrefix = `${hostUrl}${bucket}/`;
    if (decodedUrl.startsWith(bucketPrefix)) {
      return decodedUrl.substring(bucketPrefix.length);
    }

    // Try to find bucket in the URL path
    const bucketPattern = `/${bucket}/`;
    const bucketIndex = decodedUrl.indexOf(bucketPattern);
    if (bucketIndex !== -1) {
      return decodedUrl.substring(bucketIndex + bucketPattern.length);
    }

    // Re-throw original error if it was an Error, otherwise throw new one
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Could not extract file path from URL: ${decodedUrl}`
    );
  }
}

