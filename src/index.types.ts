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
  endPoint: string;
  port?: number | string;
  useSSL?: boolean | string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  folder?: string;
  private?: boolean | string;
  expiry?: number | string;
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