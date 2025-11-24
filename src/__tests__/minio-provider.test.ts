import { MinioProvider } from "../provider/minio-provider";
import { StrapiFile } from "../index.types";
import { NormalizedConfig } from "../utils/config-validator";
import { UploadError, DeleteError, SignedUrlError } from "../errors/provider-errors";
import { Client as MinioClient } from "minio";

// Mock MinIO client
jest.mock("minio");

describe("MinioProvider", () => {
  let provider: MinioProvider;
  let mockClient: jest.Mocked<MinioClient>;
  const config: NormalizedConfig = {
    endPoint: "localhost",
    port: 9000,
    useSSL: false,
    accessKey: "minioadmin",
    secretKey: "minioadmin",
    bucket: "test-bucket",
    folder: "uploads",
    private: false,
    expiry: 3600,
    debug: false,
  };

  const mockFile: StrapiFile = {
    name: "test.jpg",
    hash: "abc123",
    ext: ".jpg",
    mime: "image/jpeg",
    size: 1024,
    provider: "minio",
    buffer: Buffer.from("test content"),
  };

  beforeEach(() => {
    // Create mock client
    mockClient = {
      putObject: jest.fn().mockResolvedValue(undefined),
      removeObject: jest.fn().mockResolvedValue(undefined),
      presignedGetObject: jest.fn().mockResolvedValue("http://localhost:9000/test-bucket/uploads/abc123.jpg?signature=..."),
      bucketExists: jest.fn().mockResolvedValue(true),
    } as any;

    // Mock MinioClient constructor
    (MinioClient as jest.MockedClass<typeof MinioClient>).mockImplementation(
      () => mockClient
    );

    provider = new MinioProvider(config);
    
    // Wait for async bucket check to complete
    return new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear any pending async operations
    jest.useFakeTimers();
    jest.runAllTimers();
    jest.useRealTimers();
  });

  describe("upload", () => {
    it("should upload a file successfully", async () => {
      await provider.upload(mockFile);

      expect(mockClient.putObject).toHaveBeenCalledWith(
        "test-bucket",
        "uploads/abc123.jpg",
        mockFile.buffer,
        1024,
        expect.objectContaining({
          "Content-Type": "image/jpeg",
        })
      );
      expect(mockFile.url).toBe("http://localhost:9000/test-bucket/uploads/abc123.jpg");
    });

    it("should upload a file with stream", async () => {
      const streamFile = { ...mockFile, stream: {} as any, buffer: undefined };
      await provider.upload(streamFile);

      expect(mockClient.putObject).toHaveBeenCalledWith(
        "test-bucket",
        "uploads/abc123.jpg",
        streamFile.stream,
        1024,
        expect.objectContaining({
          "Content-Type": "image/jpeg",
        })
      );
    });

    it("should throw UploadError on upload failure", async () => {
      mockClient.putObject.mockRejectedValue(new Error("Upload failed"));

      await expect(provider.upload(mockFile)).rejects.toThrow(UploadError);
    });

    it("should throw UploadError when file has no stream or buffer", async () => {
      const invalidFile = { ...mockFile, stream: undefined, buffer: undefined };

      await expect(provider.upload(invalidFile)).rejects.toThrow(UploadError);
    });
  });

  describe("uploadStream", () => {
    it("should call upload method", async () => {
      const uploadSpy = jest.spyOn(provider, "upload");
      await provider.uploadStream(mockFile);

      expect(uploadSpy).toHaveBeenCalledWith(mockFile);
    });
  });

  describe("delete", () => {
    it("should delete a file successfully", async () => {
      mockFile.url = "http://localhost:9000/test-bucket/uploads/abc123.jpg";

      await provider.delete(mockFile);

      expect(mockClient.removeObject).toHaveBeenCalledWith(
        "test-bucket",
        "uploads/abc123.jpg"
      );
    });

    it("should throw DeleteError when URL is missing", async () => {
      const fileWithoutUrl = { ...mockFile, url: undefined };

      await expect(provider.delete(fileWithoutUrl)).rejects.toThrow(DeleteError);
    });

    it("should throw DeleteError on delete failure", async () => {
      mockFile.url = "http://localhost:9000/test-bucket/uploads/abc123.jpg";
      mockClient.removeObject.mockRejectedValue(new Error("Delete failed"));

      await expect(provider.delete(mockFile)).rejects.toThrow(DeleteError);
    });
  });

  describe("isPrivate", () => {
    it("should return false for public configuration", () => {
      expect(provider.isPrivate()).toBe(false);
    });

    it("should return true for private configuration", () => {
      const privateConfig = { ...config, private: true };
      const privateProvider = new MinioProvider(privateConfig);

      expect(privateProvider.isPrivate()).toBe(true);
    });
  });

  describe("getSignedUrl", () => {
    beforeEach(() => {
      mockFile.url = "http://localhost:9000/test-bucket/uploads/abc123.jpg";
    });

    it("should generate a signed URL", async () => {
      const result = await provider.getSignedUrl(mockFile);

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        "test-bucket",
        "uploads/abc123.jpg",
        3600
      );
      expect(result.url).toBe("http://localhost:9000/test-bucket/uploads/abc123.jpg?signature=...");
    });

    it("should use custom expiry when provided", async () => {
      await provider.getSignedUrl(mockFile, { expiresIn: 7200 });

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        "test-bucket",
        "uploads/abc123.jpg",
        7200
      );
    });

    it("should return original URL for file from different bucket", async () => {
      mockFile.url = "http://otherhost:9000/other-bucket/file.jpg";

      const result = await provider.getSignedUrl(mockFile);

      expect(mockClient.presignedGetObject).not.toHaveBeenCalled();
      expect(result.url).toBe("http://otherhost:9000/other-bucket/file.jpg");
    });

    it("should throw SignedUrlError when URL is missing", async () => {
      const fileWithoutUrl = { ...mockFile, url: undefined };

      await expect(provider.getSignedUrl(fileWithoutUrl)).rejects.toThrow(
        SignedUrlError
      );
    });

    it("should throw SignedUrlError for invalid expiry", async () => {
      await expect(
        provider.getSignedUrl(mockFile, { expiresIn: -1 })
      ).rejects.toThrow(SignedUrlError);

      await expect(
        provider.getSignedUrl(mockFile, { expiresIn: 1.5 })
      ).rejects.toThrow(SignedUrlError);
    });

    it("should throw SignedUrlError on presigned URL generation failure", async () => {
      mockClient.presignedGetObject.mockRejectedValue(
        new Error("Presigned URL failed")
      );

      await expect(provider.getSignedUrl(mockFile)).rejects.toThrow(
        SignedUrlError
      );
    });

    it("should generate signed URL for legacy file with different endpoint", async () => {
      // Legacy URL with different hostname but same bucket in pathname
      mockFile.url =
        "https://minio-homolog-api.aguiabranca.com.br/sitememoria-hmg/memory/CAPA_LINHA_DO_TEMPO_01_d48d674690.png";

      // Update config to match the bucket
      const legacyConfig = { ...config, bucket: "sitememoria-hmg" };
      const legacyProvider = new MinioProvider(legacyConfig);

      mockClient.presignedGetObject.mockResolvedValue(
        "https://minio-homolog-api.aguiabranca.com.br/sitememoria-hmg/memory/CAPA_LINHA_DO_TEMPO_01_d48d674690.png?X-Amz-Algorithm=..."
      );

      const result = await legacyProvider.getSignedUrl(mockFile);

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        "sitememoria-hmg",
        "memory/CAPA_LINHA_DO_TEMPO_01_d48d674690.png",
        3600
      );
      expect(result.url).toContain("X-Amz-Algorithm");
    });

    it("should return original URL for already signed legacy URL when no custom expiry", async () => {
      const alreadySignedUrl =
        "https://minio-homolog-api.aguiabranca.com.br/sitememoria-hmg/memory/file.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test";
      mockFile.url = alreadySignedUrl;

      const legacyConfig = { ...config, bucket: "sitememoria-hmg" };
      const legacyProvider = new MinioProvider(legacyConfig);

      const result = await legacyProvider.getSignedUrl(mockFile);

      // Should return original URL without regenerating
      expect(result.url).toBe(alreadySignedUrl);
      expect(mockClient.presignedGetObject).not.toHaveBeenCalled();
    });

    it("should regenerate signed URL for legacy file when custom expiry is provided", async () => {
      const alreadySignedUrl =
        "https://minio-homolog-api.aguiabranca.com.br/sitememoria-hmg/memory/file.png?X-Amz-Algorithm=AWS4-HMAC-SHA256";
      mockFile.url = alreadySignedUrl;

      const legacyConfig = { ...config, bucket: "sitememoria-hmg" };
      const legacyProvider = new MinioProvider(legacyConfig);

      mockClient.presignedGetObject.mockResolvedValue(
        "https://minio-homolog-api.aguiabranca.com.br/sitememoria-hmg/memory/file.png?X-Amz-Algorithm=...&X-Amz-Expires=1800"
      );

      const result = await legacyProvider.getSignedUrl(mockFile, {
        expiresIn: 1800,
      });

      // Should regenerate with custom expiry
      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        "sitememoria-hmg",
        "memory/file.png",
        1800
      );
      expect(result.url).toContain("X-Amz-Algorithm");
    });

    it("should handle legacy URL extraction failure gracefully", async () => {
      // URL that doesn't match expected structure
      mockFile.url = "https://external-site.com/random/path/file.jpg";

      const result = await provider.getSignedUrl(mockFile);

      // Should return original URL without throwing
      expect(result.url).toBe("https://external-site.com/random/path/file.jpg");
      expect(mockClient.presignedGetObject).not.toHaveBeenCalled();
    });
  });
});

