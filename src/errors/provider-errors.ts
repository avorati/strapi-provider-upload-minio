/**
 * Custom error classes for the MinIO provider
 */

export class ProviderError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    // Use captureStackTrace if available, otherwise fallback
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ConfigurationError extends ProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Configuration error: ${message}`, context);
  }
}

export class UploadError extends ProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Upload error: ${message}`, context);
  }
}

export class DeleteError extends ProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Delete error: ${message}`, context);
  }
}

export class SignedUrlError extends ProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Signed URL error: ${message}`, context);
  }
}

export class PathTraversalError extends ProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Path traversal error: ${message}`, context);
  }
}

