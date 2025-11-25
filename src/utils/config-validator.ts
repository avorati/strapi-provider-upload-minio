import { ConfigurationError } from "../errors/provider-errors";
import { ProviderOptions } from "../index.types";
import { getLogger } from "./logger";

const DEFAULT_PORT_HTTP = 9000; // Default port for HTTP
const DEFAULT_PORT_HTTPS = 443; // Default port for HTTPS
const DEFAULT_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const DEFAULT_CONNECT_TIMEOUT = 60000; // 60 seconds in milliseconds
const DEFAULT_MAX_RETRIES = 3; // Default number of retries for transient errors
const DEFAULT_RETRY_DELAY = 1000; // Default delay between retries in milliseconds
const MIN_PORT = 1;
const MAX_PORT = 65535;

/**
 * Validates if a string is a valid IPv4 address
 */
function isValidIPv4(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

/**
 * Validates if a string is a valid IPv6 address (basic validation)
 * Supports:
 * - Full addresses (8 groups): 2001:0db8:85a3:0000:0000:8a2e:0370:7334
 * - Compressed addresses: 2001:db8::8a2e:370:7334
 * - Addresses ending with :: : 2001:db8:: or fe80::
 * - Addresses starting with :: : ::1 or ::
 */
function isValidIPv6(ip: string): boolean {
  // Check for :: (compression marker) - only one allowed
  const compressionCount = (ip.match(/::/g) || []).length;
  if (compressionCount > 1) {
    return false;
  }

  // Split by :: to get parts before and after compression
  const parts = ip.split("::");
  
  if (parts.length === 1) {
    // No compression - must be full 8 groups
    const groups = parts[0].split(":");
    if (groups.length !== 8) {
      return false;
    }
    return groups.every((group) => /^[0-9a-fA-F]{1,4}$/.test(group));
  }

  // Has compression
  const before = parts[0] ? parts[0].split(":").filter((g) => g.length > 0) : [];
  const after = parts[1] ? parts[1].split(":").filter((g) => g.length > 0) : [];
  
  // Total groups (before + after) must be <= 7 (since :: represents missing groups)
  const totalGroups = before.length + after.length;
  if (totalGroups > 7) {
    return false;
  }

  // Validate all groups are valid hex (1-4 hex digits)
  const hexGroupPattern = /^[0-9a-fA-F]{1,4}$/;
  const allGroupsValid = 
    before.every((group) => hexGroupPattern.test(group)) &&
    after.every((group) => hexGroupPattern.test(group));

  return allGroupsValid;
}

/**
 * Validates if a string is a valid hostname
 * Allows localhost, domain names, and IP addresses
 */
function isValidHostname(hostname: string): boolean {
  // Allow localhost
  if (hostname === "localhost") {
    return true;
  }

  // Check if it's an IP address
  if (isValidIPv4(hostname) || isValidIPv6(hostname)) {
    return true;
  }

  // Validate domain name format
  // Hostname regex: allows letters, digits, hyphens, dots
  // Must start and end with alphanumeric character
  // Must not exceed 253 characters
  if (hostname.length > 253) {
    return false;
  }

  const hostnameRegex =
    /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return hostnameRegex.test(hostname);
}

/**
 * Validates if a string is a valid bucket name according to S3/MinIO rules
 * Rules:
 * - 3-63 characters long
 * - Can contain lowercase letters, numbers, dots (.), and hyphens (-)
 * - Must start and end with a letter or number
 * - Cannot be formatted as an IP address (e.g., 192.168.1.1)
 * - Cannot contain consecutive dots (..)
 */
function isValidBucketName(bucket: string): boolean {
  // Length must be between 3 and 63 characters
  if (bucket.length < 3 || bucket.length > 63) {
    return false;
  }

  // Must start and end with a letter or number
  if (!/^[a-z0-9]/.test(bucket) || !/[a-z0-9]$/.test(bucket)) {
    return false;
  }

  // Cannot be formatted as an IP address
  if (isValidIPv4(bucket)) {
    return false;
  }

  // Cannot contain consecutive dots
  if (bucket.includes("..")) {
    return false;
  }

  // Can only contain lowercase letters, numbers, dots, and hyphens
  const bucketRegex = /^[a-z0-9.-]+$/;
  return bucketRegex.test(bucket);
}

export interface NormalizedConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  folder: string;
  private: boolean;
  expiry: number;
  connectTimeout?: number; // Connection timeout in milliseconds
  requestTimeout?: number; // Request timeout in milliseconds (optional, for future use)
  debug: boolean; // Enable verbose debug logging
  rejectUnauthorized: boolean; // Reject unauthorized SSL certificates (default: true). Set to false for self-signed certificates
  maxRetries?: number; // Maximum number of retries for transient errors (default: 3)
  retryDelay?: number; // Delay between retries in milliseconds (default: 1000)
  keepAlive?: boolean; // Enable HTTP keep-alive connections (default: false to avoid proxy/firewall issues)
}

/**
 * Validates and normalizes provider configuration options
 */
export function validateAndNormalizeConfig(
  options: ProviderOptions
): NormalizedConfig {
  // Get endpoint from endPoint or host (host is alias for endPoint)
  const endPointValue = options.endPoint || options.host;
  
  // Validate required fields
  if (!endPointValue || typeof endPointValue !== "string") {
    throw new ConfigurationError(
      "endPoint or host is required and must be a string. " +
      "You can use either 'endPoint' or 'host' (both work the same way).",
      {
        providedEndPoint: options.endPoint,
        providedHost: options.host,
      }
    );
  }

  if (!options.accessKey || typeof options.accessKey !== "string") {
    throw new ConfigurationError(
      "accessKey is required and must be a string",
      { provided: typeof options.accessKey }
    );
  }

  if (!options.secretKey || typeof options.secretKey !== "string") {
    throw new ConfigurationError(
      "secretKey is required and must be a string",
      { provided: typeof options.secretKey }
    );
  }

  if (!options.bucket || typeof options.bucket !== "string") {
    throw new ConfigurationError("bucket is required and must be a string", {
      provided: typeof options.bucket,
    });
  }

  const logger = getLogger();

  // Normalize boolean values first to determine default port
  const useSSL = parseBoolean(options.useSSL);

  // Parse and validate port
  let port: number;
  if (options.port === undefined) {
    // Use default port based on SSL configuration
    port = useSSL ? DEFAULT_PORT_HTTPS : DEFAULT_PORT_HTTP;
  } else {
    const parsedPort = parseNumber(options.port);
    if (parsedPort === undefined) {
      const defaultPort = useSSL ? DEFAULT_PORT_HTTPS : DEFAULT_PORT_HTTP;
      logger.warn(
        `[strapi-provider-upload-minio] Warning: Invalid port value "${options.port}". Using default port ${defaultPort} for ${useSSL ? "HTTPS" : "HTTP"}.`
      );
      port = defaultPort;
    } else {
      port = parsedPort;
    }
  }
  if (
    typeof port !== "number" ||
    port < MIN_PORT ||
    port > MAX_PORT ||
    !Number.isInteger(port)
  ) {
    const defaultPort = useSSL ? DEFAULT_PORT_HTTPS : DEFAULT_PORT_HTTP;
    logger.warn(
      `[strapi-provider-upload-minio] Warning: Port ${port} is out of valid range (${MIN_PORT}-${MAX_PORT}). Using default port ${defaultPort} for ${useSSL ? "HTTPS" : "HTTP"}.`
    );
    port = defaultPort;
  }

  // Auto-correct potentially incorrect port configuration
  // Common mistake: useSSL=true with port 9000 (HTTP default)
  // Automatically adjust to 443 (HTTPS default) to prevent connection errors
  if (useSSL && port === DEFAULT_PORT_HTTP) {
    logger.warn(
      `[strapi-provider-upload-minio] Auto-correcting: SSL is enabled but port is ${DEFAULT_PORT_HTTP} (HTTP default). ` +
      `Automatically using port ${DEFAULT_PORT_HTTPS} (HTTPS default) instead.`
    );
    port = DEFAULT_PORT_HTTPS;
  }
  // Also warn about HTTP with port 443 (HTTPS default) - less common, just warn
  if (!useSSL && port === DEFAULT_PORT_HTTPS) {
    logger.warn(
      `[strapi-provider-upload-minio] Warning: SSL is disabled (useSSL=false) but port is ${DEFAULT_PORT_HTTPS} (HTTPS default). ` +
      `This may cause connection issues. For HTTP, consider using port ${DEFAULT_PORT_HTTP} (default HTTP port) or the correct HTTP port for your MinIO server.`
    );
  }

  // Parse and validate expiry
  let expiry: number;
  if (options.expiry === undefined) {
    expiry = DEFAULT_EXPIRY;
  } else {
    const parsedExpiry = parseNumber(options.expiry);
    if (parsedExpiry === undefined) {
      logger.warn(
        `[strapi-provider-upload-minio] Warning: Invalid expiry value "${options.expiry}". Using default expiry ${DEFAULT_EXPIRY} seconds (${DEFAULT_EXPIRY / (24 * 60 * 60)} days).`
      );
      expiry = DEFAULT_EXPIRY;
    } else {
      expiry = parsedExpiry;
    }
  }
  if (typeof expiry !== "number" || expiry <= 0 || !Number.isInteger(expiry)) {
    logger.warn(
      `[strapi-provider-upload-minio] Warning: Expiry ${expiry} is invalid (must be a positive integer). Using default expiry ${DEFAULT_EXPIRY} seconds (${DEFAULT_EXPIRY / (24 * 60 * 60)} days).`
    );
    expiry = DEFAULT_EXPIRY;
  }

  // useSSL was already normalized above for port validation
  const isPrivate = parseBoolean(options.private);
  const debug = parseBoolean(options.debug);
  // rejectUnauthorized defaults to true (secure by default)
  // Only set to false if explicitly provided as false (for self-signed certs in dev/hmg)
  const rejectUnauthorized = options.rejectUnauthorized === undefined 
    ? true 
    : parseBoolean(options.rejectUnauthorized);

  // Validate private configuration
  if (isPrivate) {
    if (!options.accessKey || !options.secretKey) {
      throw new ConfigurationError(
        "accessKey and secretKey are required when private=true",
        { private: isPrivate }
      );
    }
  }

  // Trim and validate non-empty values
  const trimmedEndPoint = endPointValue.trim();
  const trimmedAccessKey = options.accessKey.trim();
  const trimmedSecretKey = options.secretKey.trim();
  const trimmedBucket = options.bucket.trim();
  const trimmedFolder = (options.folder || "").trim();

  // Validate that required fields are not empty after trim
  if (!trimmedEndPoint) {
    throw new ConfigurationError(
      "endPoint or host cannot be empty after trimming whitespace",
      { 
        providedEndPoint: options.endPoint,
        providedHost: options.host,
      }
    );
  }

  // Validate endpoint format (hostname or IP address)
  if (!isValidHostname(trimmedEndPoint)) {
    throw new ConfigurationError(
      "endPoint must be a valid hostname or IP address",
      { provided: trimmedEndPoint }
    );
  }

  if (!trimmedAccessKey) {
    throw new ConfigurationError(
      "accessKey cannot be empty after trimming whitespace",
      { provided: typeof options.accessKey }
    );
  }

  if (!trimmedSecretKey) {
    throw new ConfigurationError(
      "secretKey cannot be empty after trimming whitespace",
      { provided: typeof options.secretKey }
    );
  }

  if (!trimmedBucket) {
    throw new ConfigurationError(
      "bucket cannot be empty after trimming whitespace",
      { provided: options.bucket }
    );
  }

  // Validate bucket name format (S3/MinIO naming rules)
  if (!isValidBucketName(trimmedBucket)) {
    throw new ConfigurationError(
      "bucket name must follow S3/MinIO naming rules: 3-63 characters, lowercase letters, numbers, dots (.), and hyphens (-), must start and end with letter or number, cannot be an IP address",
      { provided: trimmedBucket }
    );
  }

  // Parse and validate connectTimeout
  let connectTimeout: number | undefined;
  if (options.connectTimeout !== undefined) {
    const parsedTimeout = parseNumber(options.connectTimeout);
    if (parsedTimeout !== undefined && parsedTimeout > 0) {
      connectTimeout = parsedTimeout;
    } else {
      logger.warn(
        `[strapi-provider-upload-minio] Warning: Invalid connectTimeout value "${options.connectTimeout}". Using default connectTimeout ${DEFAULT_CONNECT_TIMEOUT}ms (${DEFAULT_CONNECT_TIMEOUT / 1000} seconds).`
      );
    }
  }
  // Use default if not provided or invalid
  if (connectTimeout === undefined) {
    connectTimeout = DEFAULT_CONNECT_TIMEOUT;
  }

  // Parse and validate requestTimeout (optional, for future use)
  let requestTimeout: number | undefined;
  if (options.requestTimeout !== undefined) {
    const parsedTimeout = parseNumber(options.requestTimeout);
    if (parsedTimeout !== undefined && parsedTimeout > 0) {
      requestTimeout = parsedTimeout;
    } else {
      logger.warn(
        `[strapi-provider-upload-minio] Warning: Invalid requestTimeout value "${options.requestTimeout}". Ignoring requestTimeout.`
      );
    }
  }

  // Parse and validate maxRetries
  let maxRetries: number | undefined;
  if (options.maxRetries !== undefined) {
    const parsedRetries = parseNumber(options.maxRetries);
    if (parsedRetries !== undefined && parsedRetries >= 0) {
      maxRetries = parsedRetries;
    } else {
      logger.warn(
        `[strapi-provider-upload-minio] Warning: Invalid maxRetries value "${options.maxRetries}". Using default maxRetries ${DEFAULT_MAX_RETRIES}.`
      );
    }
  }
  if (maxRetries === undefined) {
    maxRetries = DEFAULT_MAX_RETRIES;
  }

  // Parse and validate retryDelay
  let retryDelay: number | undefined;
  if (options.retryDelay !== undefined) {
    const parsedDelay = parseNumber(options.retryDelay);
    if (parsedDelay !== undefined && parsedDelay >= 0) {
      retryDelay = parsedDelay;
    } else {
      logger.warn(
        `[strapi-provider-upload-minio] Warning: Invalid retryDelay value "${options.retryDelay}". Using default retryDelay ${DEFAULT_RETRY_DELAY}ms.`
      );
    }
  }
  if (retryDelay === undefined) {
    retryDelay = DEFAULT_RETRY_DELAY;
  }

  // Parse and validate keepAlive (default: false to avoid proxy/firewall issues)
  const keepAlive = options.keepAlive === undefined 
    ? false 
    : parseBoolean(options.keepAlive);

  const normalizedConfig: NormalizedConfig = {
    endPoint: trimmedEndPoint,
    port,
    useSSL,
    accessKey: trimmedAccessKey,
    secretKey: trimmedSecretKey,
    bucket: trimmedBucket,
    folder: trimmedFolder,
    private: isPrivate,
    expiry,
    connectTimeout,
    debug,
    rejectUnauthorized,
    maxRetries,
    retryDelay,
    keepAlive,
  };

  if (requestTimeout !== undefined) {
    normalizedConfig.requestTimeout = requestTimeout;
  }

  return normalizedConfig;
}

/**
 * Parses a number value from various formats (number, string, undefined)
 * Converts string representations of numbers to actual numbers
 */
function parseNumber(value: number | string | undefined): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Parses a boolean value from various formats (boolean, string, undefined)
 */
function parseBoolean(value: boolean | string | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

