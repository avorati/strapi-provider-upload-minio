import { ReadStream } from "fs";

/**
 * Format metadata for image variations (thumbnails, etc.)
 */
export interface ImageFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  path?: string;
  url?: string;
}

/**
 * File metadata structure
 */
export interface FileMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Provider-specific metadata
 */
export interface ProviderMetadata {
  [key: string]: unknown;
}

export interface StrapiFile {
  name: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: Record<string, ImageFormat>;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url?: string;
  previewUrl?: string;
  provider: string;
  provider_metadata?: ProviderMetadata;
  stream?: ReadStream;
  buffer?: Buffer;
  path?: string;
  metadata?: FileMetadata;
}

export interface ProviderOptions {
  endPoint?: string; // MinIO server endpoint (or use host)
  host?: string; // Alternative to endPoint (alias)
  port?: number | string;
  useSSL?: boolean | string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  folder?: string;
  private?: boolean | string;
  expiry?: number | string;
  connectTimeout?: number | string; // Connection timeout in milliseconds
  requestTimeout?: number | string; // Request timeout in milliseconds (optional, for future use)
  debug?: boolean | string; // Enable verbose debug logging
  rejectUnauthorized?: boolean | string; // Reject unauthorized SSL certificates (default: true). Set to false for self-signed certificates in dev/hmg environments
  maxRetries?: number | string; // Maximum number of retries for transient errors (default: 3)
  retryDelay?: number | string; // Delay between retries in milliseconds (default: 1000)
  keepAlive?: boolean | string; // Enable HTTP keep-alive connections (default: false to avoid proxy/firewall issues)
}

export interface SignedUrlResponse {
  url: string;
}

export interface SignedUrlOptions {
  expiresIn?: number; // Expiry time in seconds
}

export interface StrapiProvider {
  uploadStream(file: StrapiFile): Promise<void>;
  upload(file: StrapiFile): Promise<void>;
  delete(file: StrapiFile): Promise<void>;
  isPrivate(): boolean;
  getSignedUrl(
    file: StrapiFile,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse>;
}