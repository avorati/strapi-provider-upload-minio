import { StrapiFile } from "../index.types";
import { PathTraversalError } from "../errors/provider-errors";

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
  const sanitizedHash = sanitizePathSegment(file.hash);
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
  return pathSegments.join("/");
}

/**
 * Extracts the file path from a MinIO URL
 * Removes query string parameters and URL fragments to get only the file path
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

  // Extract the file path by removing the bucket prefix
  const bucketPrefix = `${hostUrl}${bucket}/`;
  const filePath = decodedUrl.replace(bucketPrefix, "");

  return filePath;
}

