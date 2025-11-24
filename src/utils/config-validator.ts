import { ConfigurationError } from "../errors/provider-errors";
import { ProviderOptions } from "../index.types";

const DEFAULT_PORT = 9000;
const DEFAULT_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
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
 */
function isValidIPv6(ip: string): boolean {
  const ipv6Regex =
    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
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

  // Validate port
  const port = options.port !== undefined ? options.port : DEFAULT_PORT;
  if (
    typeof port !== "number" ||
    port < MIN_PORT ||
    port > MAX_PORT ||
    !Number.isInteger(port)
  ) {
    throw new ConfigurationError(
      `port must be an integer between ${MIN_PORT} and ${MAX_PORT}`,
      { provided: port }
    );
  }

  // Validate expiry
  const expiry = options.expiry !== undefined ? options.expiry : DEFAULT_EXPIRY;
  if (typeof expiry !== "number" || expiry <= 0 || !Number.isInteger(expiry)) {
    throw new ConfigurationError(
      "expiry must be a positive integer (seconds)",
      { provided: expiry }
    );
  }

  // Normalize boolean values
  const useSSL = parseBoolean(options.useSSL);
  const isPrivate = parseBoolean(options.private);

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

  return {
    endPoint: trimmedEndPoint,
    port,
    useSSL,
    accessKey: trimmedAccessKey,
    secretKey: trimmedSecretKey,
    bucket: trimmedBucket,
    folder: trimmedFolder,
    private: isPrivate,
    expiry,
  };
}

/**
 * Parses a boolean value from various formats (boolean, string, undefined)
 */
function parseBoolean(value: boolean | string | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

