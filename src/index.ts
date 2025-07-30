import { Client as MinioClient } from 'minio';
import { lookup as getMimeType } from 'mime-types';
import { Readable } from 'stream';
import { ProviderOptions, SignedUrlResponse, StrapiFile, StrapiProvider } from './index.types';

const DEFAULT_PORT = 9000;
const DEFAULT_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const DEFAULT_MIME_TYPE = 'application/octet-stream';

class MinioProvider implements StrapiProvider {
  private readonly client: MinioClient;
  private readonly config: Required<Omit<ProviderOptions, 'useSSL' | 'private'>> & {
    useSSL: boolean;
    private: boolean;
  };

  constructor(options: ProviderOptions) {
    this.config = this.normalizeConfig(options);
    this.client = this.createMinioClient();
  }

  private normalizeConfig(options: ProviderOptions): Required<Omit<ProviderOptions, 'useSSL' | 'private'>> & {
    useSSL: boolean;
    private: boolean;
  } {
    return {
      endPoint: options.endPoint,
      port: options.port || DEFAULT_PORT,
      useSSL: this.parseBoolean(options.useSSL),
      accessKey: options.accessKey,
      secretKey: options.secretKey,
      bucket: options.bucket,
      folder: options.folder || '',
      private: this.parseBoolean(options.private),
      expiry: options.expiry || DEFAULT_EXPIRY,
    };
  }

  private parseBoolean(value: boolean | string | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  }

  private createMinioClient(): MinioClient {
    return new MinioClient({
      endPoint: this.config.endPoint,
      port: this.config.port,
      useSSL: this.config.useSSL, // Now properly typed as boolean
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
    });
  }

  private buildUploadPath(file: StrapiFile): string {
    const pathSegments: string[] = [];
    
    if (this.config.folder) {
      pathSegments.push(this.config.folder);
    }
    
    if (file.path) {
      pathSegments.push(file.path);
    }
    
    pathSegments.push(`${file.hash}${file.ext}`);
    
    return pathSegments.join('/');
  }

  private buildHostUrl(): string {
    const protocol = this.config.useSSL ? 'https://' : 'http://';
    const shouldIncludePort = this.shouldIncludePortInUrl();
    const portSuffix = shouldIncludePort ? `:${this.config.port}` : '';
    
    return `${protocol}${this.config.endPoint}${portSuffix}/`;
  }

  private shouldIncludePortInUrl(): boolean {
    const { port, useSSL } = this.config;
    
    if (useSSL && (port === 443 || port === 80)) {
      return false;
    }
    
    if (!useSSL && port === 80) {
      return false;
    }
    
    return true;
  }

  private extractFilePathFromUrl(file: StrapiFile): string {
    if (!file.url) {
      throw new Error('File URL is required for path extraction');
    }

    const hostUrl = this.buildHostUrl();
    const bucketPrefix = `${hostUrl}${this.config.bucket}/`;
    
    return file.url.replace(bucketPrefix, '');
  }

  private createMetadata(file: StrapiFile): Record<string, string> {
    const contentType = getMimeType(file.ext) || DEFAULT_MIME_TYPE;
    
    return {
      'Content-Type': contentType,
    };
  }

  private createFileUrl(uploadPath: string): string {
    const hostUrl = this.buildHostUrl();
    return `${hostUrl}${this.config.bucket}/${uploadPath}`;
  }

  private getFileContent(file: StrapiFile): Readable | Buffer {
    if (file.stream) {
      return file.stream;
    }
    
    if (file.buffer) {
      // Fix: Don't pass 'binary' as second parameter to Buffer.from when buffer is already a Buffer
      return file.buffer;
    }
    
    throw new Error('File must have either stream or buffer property');
  }

  private isFileFromSameBucket(file: StrapiFile): boolean {
    if (!file.url) {
      return false;
    }

    try {
      const url = new URL(file.url);
      const isSameHost = url.hostname === this.config.endPoint;
      const isFromBucket = url.pathname.startsWith(`/${this.config.bucket}/`);
      
      return isSameHost && isFromBucket;
    } catch {
      return false;
    }
  }

  public async uploadStream(file: StrapiFile): Promise<void> {
    return this.upload(file);
  }

  public async upload(file: StrapiFile): Promise<void> {
    return new Promise((resolve, reject) => {
      const uploadPath = this.buildUploadPath(file);
      const metadata = this.createMetadata(file);
      const content = this.getFileContent(file);

      // putObject: bucket, objectName, stream|buffer, size, metaData
      this.client.putObject(
        this.config.bucket,
        uploadPath,
        content,
        file.size,
        metadata
      ).then(() => {
        file.url = this.createFileUrl(uploadPath);
        resolve();
      }).catch((error: Error) => {
        reject(new Error(`Failed to upload file: ${error.message}`));
      });
    });
  }

  public async delete(file: StrapiFile): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const filePath = this.extractFilePathFromUrl(file);
        // removeObject: bucket, objectName
        this.client.removeObject(
          this.config.bucket,
          filePath
        ).then(() => {
          resolve();
        }).catch((error: Error) => {
          reject(new Error(`Failed to delete file: ${error.message}`));
        });
      } catch (error) {
        reject(new Error(`Failed to extract file path: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  public isPrivate(): boolean {
    return this.config.private;
  }

  public async getSignedUrl(file: StrapiFile): Promise<SignedUrlResponse> {
    if (!file.url) {
      throw new Error('File URL is required for signed URL generation');
    }

    return new Promise((resolve, reject) => {
      // If file is not from the same bucket, return the original URL
      if (!this.isFileFromSameBucket(file)) {
        return resolve({ url: file.url! });
      }
      try {
        const filePath = this.extractFilePathFromUrl(file);
        // presignedGetObject: bucket, objectName, expiry
        this.client.presignedGetObject(
          this.config.bucket,
          filePath,
          this.config.expiry
        ).then((presignedUrl: string) => {
          resolve({ url: presignedUrl });
        }).catch((error: Error) => {
          reject(new Error(`Failed to generate signed URL: ${error.message}`));
        });
      } catch (error) {
        reject(new Error(`Failed to process signed URL request: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }
}

// Factory function for Strapi
export = {
  init(providerOptions: ProviderOptions): StrapiProvider {
    return new MinioProvider(providerOptions);
  },
};