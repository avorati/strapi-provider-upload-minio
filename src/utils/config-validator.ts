import { ConfigurationError } from "../errors/provider-errors";
import { ProviderOptions } from "../index.types";

const DEFAULT_PORT = 9000;
const DEFAULT_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const MIN_PORT = 1;
const MAX_PORT = 65535;

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

  return {
    endPoint: options.endPoint.trim(),
    port,
    useSSL,
    accessKey: options.accessKey.trim(),
    secretKey: options.secretKey.trim(),
    bucket: options.bucket.trim(),
    folder: (options.folder || "").trim(),
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

