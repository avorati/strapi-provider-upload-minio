import { ConfigurationError } from "../errors/provider-errors";
import { ProviderOptions } from "../index.types";
import { getLogger } from "./logger";

const DEFAULT_PORT = 9000;
const DEFAULT_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const DEFAULT_CONNECT_TIMEOUT = 60000; // 60 seconds in milliseconds
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
}

/**
 * Validates and normalizes provider configuration options
 */
export function validateAndNormalizeConfig(
  options: ProviderOptions
): NormalizedConfig {
  // Validate required fields
  if (!options.endPoint || typeof options.endPoint !== "string") {
    throw new ConfigurationError("endPoint is required and must be a string", {
      provided: options.endPoint,
    });
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

  // Parse and validate port
  let port: number;
  if (options.port === undefined) {
    port = DEFAULT_PORT;
  } else {
    const parsedPort = parseNumber(options.port);
    if (parsedPort === undefined) {
      logger.warn(
        `[strapi-provider-upload-minio] Warning: Invalid port value "${options.port}". Using default port ${DEFAULT_PORT}.`
      );
      port = DEFAULT_PORT;
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
    logger.warn(
      `[strapi-provider-upload-minio] Warning: Port ${port} is out of valid range (${MIN_PORT}-${MAX_PORT}). Using default port ${DEFAULT_PORT}.`
    );
    port = DEFAULT_PORT;
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

  // Normalize boolean values
  const useSSL = parseBoolean(options.useSSL);
  const isPrivate = parseBoolean(options.private);
  const debug = parseBoolean(options.debug);

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
  const trimmedEndPoint = options.endPoint.trim();
  const trimmedAccessKey = options.accessKey.trim();
  const trimmedSecretKey = options.secretKey.trim();
  const trimmedBucket = options.bucket.trim();
  const trimmedFolder = (options.folder || "").trim();

  // Validate that required fields are not empty after trim
  if (!trimmedEndPoint) {
    throw new ConfigurationError(
      "endPoint cannot be empty after trimming whitespace",
      { provided: options.endPoint }
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

