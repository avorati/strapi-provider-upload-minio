import { NormalizedConfig } from "./config-validator";

/**
 * Builds the host URL for MinIO
 */
export function buildHostUrl(config: NormalizedConfig): string {
  const protocol = config.useSSL ? "https://" : "http://";
  const shouldIncludePort = shouldIncludePortInUrl(config.port, config.useSSL);
  const portSuffix = shouldIncludePort ? `:${config.port}` : "";

  return `${protocol}${config.endPoint}${portSuffix}/`;
}

/**
 * Determines if the port should be included in the URL
 * Port 443 is default for HTTPS, port 80 is default for HTTP
 * Only omit these ports when they match the protocol default
 */
function shouldIncludePortInUrl(port: number, useSSL: boolean): boolean {
  // For HTTPS, only omit port 443 (default HTTPS port)
  if (useSSL && port === 443) {
    return false;
  }

  // For HTTP, only omit port 80 (default HTTP port)
  if (!useSSL && port === 80) {
    return false;
  }

  return true;
}

/**
 * Creates a file URL from the upload path
 */
export function createFileUrl(
  uploadPath: string,
  hostUrl: string,
  bucket: string
): string {
  return `${hostUrl}${bucket}/${uploadPath}`;
}

/**
 * Checks if a URL's pathname contains the specified bucket
 * This is a more lenient check that only looks at the pathname structure
 */
export function pathnameContainsBucket(
  fileUrl: string | undefined,
  bucket: string
): boolean {
  if (!fileUrl) {
    return false;
  }

  try {
    const url = new URL(fileUrl);
    return url.pathname.startsWith(`/${bucket}/`) || url.pathname === `/${bucket}`;
  } catch {
    return false;
  }
}

/**
 * Checks if a file URL belongs to the same bucket
 * This function is more flexible and focuses on detecting the bucket in the pathname
 * rather than requiring an exact hostname match, to support legacy URLs with different endpoints
 */
export function isFileFromSameBucket(
  fileUrl: string | undefined,
  endPoint: string,
  bucket: string
): boolean {
  if (!fileUrl) {
    return false;
  }

  try {
    const url = new URL(fileUrl);
    
    // Primary check: verify if pathname starts with /{bucket}/
    // This is the most reliable indicator that the file is from our bucket
    const isFromBucket = url.pathname.startsWith(`/${bucket}/`) || 
                         url.pathname === `/${bucket}`;
    
    if (!isFromBucket) {
      return false;
    }

    // Secondary check: try to match hostname, but be more flexible
    // Allow match if hostname matches exactly, or if one contains the other
    // This allows legacy URLs with different endpoints to still be processed
    // (e.g., localhost vs minio-homolog-api.aguiabranca.com.br)
    const isSameHost = url.hostname === endPoint || 
                       url.hostname.includes(endPoint) || 
                       endPoint.includes(url.hostname);

    // If hostname matches (exactly or partially), consider it valid
    if (isSameHost) {
      return true;
    }

    // If hostname doesn't match at all, but pathname has the bucket,
    // we still consider it valid for legacy URLs (e.g., different domain but same bucket structure)
    // This is more permissive to handle migration scenarios
    // However, we require that the hostname is a valid domain (not just any string)
    const isValidDomain = url.hostname.includes(".") || url.hostname === "localhost";
    
    return isValidDomain;
  } catch {
    return false;
  }
}

