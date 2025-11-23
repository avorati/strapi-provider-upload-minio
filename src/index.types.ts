import { ReadStream } from "fs";

export interface StrapiFile {
  name: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: Record<string, any>;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url?: string;
  previewUrl?: string;
  provider: string;
  provider_metadata?: Record<string, any>;
  stream?: ReadStream;
  buffer?: Buffer;
  path?: string;
  metadata?: Record<string, any>;
}

export interface ProviderOptions {
  endPoint: string;
  port?: number;
  useSSL?: boolean | string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  folder?: string;
  private?: boolean | string;
  expiry?: number;
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