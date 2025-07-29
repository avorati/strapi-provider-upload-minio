
import {jest, describe, beforeEach, expect, it} from '@jest/globals';

import * as minioProvider from '../index';
import { Client } from 'minio';
import type { StrapiFile } from '../index.types';

// Mock MinIO client
jest.mock('minio');
const MockedClient = Client as unknown as jest.Mocked<typeof Client>;

describe('MinIO Provider', () => {
  const mockConfig = {
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'test-access-key',
    secretKey: 'test-secret-key',
    bucket: 'test-bucket',
    region: 'us-east-1'
  };

  const mockFile: StrapiFile = {
    name: 'test.jpg',
    alternativeText: 'Test image',
    caption: 'Test caption',
    hash: 'test_hash',
    ext: '.jpg',
    mime: 'image/jpeg',
    size: 12345,
    buffer: Buffer.from('test file content'),
    provider: 'minio',
    // The url and provider_metadata properties are optional and will be filled by the provider
  };

  let provider: any;
  let mockClient: jest.Mocked<Client>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      setBucketPolicy: jest.fn(),
      putObject: jest.fn(),
      removeObject: jest.fn(),
      presignedGetObject: jest.fn()
    } as any;

    MockedClient.mockImplementation(() => mockClient);
    provider = minioProvider.init(mockConfig);
  });

  describe('initialization', () => {
    it('should throw error when required config is missing', () => {
      expect(() => {
        minioProvider.init({} as any);
      }).toThrow('MinIO provider requires endPoint, accessKey, secretKey, and bucket');
    });

    it('should initialize with valid config', () => {
      expect(() => {
        minioProvider.init(mockConfig);
      }).not.toThrow();
    });
  });

  describe('upload', () => {
    beforeEach(() => {
      mockClient.bucketExists.mockResolvedValue(true);
      mockClient.putObject.mockResolvedValue({ etag: 'test-etag' } as any);
    });

    it('should upload file successfully', async () => {
      await provider.upload(mockFile);

      expect(mockClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        'test_hash.jpg',
        mockFile.buffer,
        mockFile.buffer!.length,
        expect.objectContaining({
          'Content-Type': 'image/jpeg',
          'Content-Disposition': 'inline; filename="test.jpg"'
        })
      );

      expect(mockFile.url).toBe('http://localhost:9000/test-bucket/test_hash.jpg');
      expect(mockFile.provider_metadata).toEqual({
        key: 'test_hash.jpg',
        bucket: 'test-bucket',
        region: 'us-east-1',
        etag: 'test-etag'
      });
    });

    it('should create bucket if it does not exist', async () => {
      mockClient.bucketExists.mockResolvedValue(false);

      await provider.upload(mockFile);

      expect(mockClient.makeBucket).toHaveBeenCalledWith('test-bucket', 'us-east-1');
      expect(mockClient.setBucketPolicy).toHaveBeenCalled();
    });

    it('should handle upload with folder', async () => {
      const configWithFolder = { ...mockConfig, folder: 'uploads/' };
      const providerWithFolder = minioProvider.init(configWithFolder);

      await providerWithFolder.upload(mockFile);

      expect(mockClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        'uploads/test_hash.jpg',
        expect.any(Buffer),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should not set public URL for private files', async () => {
      await provider.upload(mockFile, { isPrivate: true });

      expect(mockFile.url).toBeUndefined();
    });

    it('should handle upload errors', async () => {
      const error = new Error('Upload failed');
      mockClient.putObject.mockRejectedValue(error);

      await expect(provider.upload(mockFile)).rejects.toThrow('MinIO upload failed: Upload failed');
    });
  });

  describe('delete', () => {
    it('should delete file successfully', async () => {
      const fileWithMetadata = {
        ...mockFile,
        provider_metadata: {
          key: 'test_hash.jpg',
          bucket: 'test-bucket'
        }
      };

      await provider.delete(fileWithMetadata);

      expect(mockClient.removeObject).toHaveBeenCalledWith('test-bucket', 'test_hash.jpg');
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockClient.removeObject.mockRejectedValue(error);

      await expect(provider.delete(mockFile)).rejects.toThrow('MinIO delete failed: Delete failed');
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL', async () => {
      const expectedUrl = 'https://example.com/signed-url';
      mockClient.presignedGetObject.mockResolvedValue(expectedUrl);

      const result = await provider.getSignedUrl(mockFile);

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        'test-bucket',
        'test_hash.jpg',
        3600
      );
      expect(result).toBe(expectedUrl);
    });

    it('should handle custom expiry time', async () => {
      const expectedUrl = 'https://example.com/signed-url';
      mockClient.presignedGetObject.mockResolvedValue(expectedUrl);

      await provider.getSignedUrl(mockFile, { expiresIn: 7200 });

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        'test-bucket',
        'test_hash.jpg',
        7200
      );
    });

    it('should handle signed URL errors', async () => {
      const error = new Error('Signed URL failed');
      mockClient.presignedGetObject.mockRejectedValue(error);

      await expect(provider.getSignedUrl(mockFile)).rejects.toThrow(
        'MinIO signed URL generation failed: Signed URL failed'
      );
    });
  });

  describe('checkFileSize', () => {
    it('should pass when file size is within limit', async () => {
      await expect(provider.checkFileSize(mockFile, { sizeLimit: 20000 })).resolves.not.toThrow();
    });

    it('should throw when file size exceeds limit', async () => {
      await expect(provider.checkFileSize(mockFile, { sizeLimit: 10000 })).rejects.toThrow(
        'File size exceeds limit of 10000 bytes'
      );
    });
  });

  describe('isPrivate', () => {
    it('should return false by default', async () => {
      const result = await provider.isPrivate();
      expect(result).toBe(false);
    });
  });
});