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
 * Checks if a file URL belongs to the same bucket
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
    const isSameHost = url.hostname === endPoint;
    const isFromBucket = url.pathname.startsWith(`/${bucket}/`);

    return isSameHost && isFromBucket;
  } catch {
    return false;
  }
}

