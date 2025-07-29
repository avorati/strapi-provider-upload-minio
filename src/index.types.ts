import type { ReadStream } from "fs";

export interface MinIOConfig {
  endPoint: string;
  port?: number;
  useSSL?: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
  folder?: string;
  baseUrl?: string;
  publicPolicy?: boolean; // Adicionado
}

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
  metadata?: Record<string, any>; // Adicionado
}

export interface UploadOptions {
  isPrivate?: boolean;
}