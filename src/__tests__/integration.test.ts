/**
 * Integration tests for MinIO provider
 * These tests require a running MinIO instance
 * 
 * To run these tests, set the following environment variables:
 * - MINIO_ENDPOINT (default: localhost)
 * - MINIO_PORT (default: 9000)
 * - MINIO_USE_SSL (default: false)
 * - MINIO_ACCESS_KEY
 * - MINIO_SECRET_KEY
 * - MINIO_BUCKET (default: strapi-boiler)
 * - MINIO_FOLDER (default: cms)
 */

import { MinioProvider } from "../provider/minio-provider";
import { validateAndNormalizeConfig } from "../utils/config-validator";
import { StrapiFile } from "../index.types";

// Skip integration tests if MINIO_ACCESS_KEY is not set
const shouldRunIntegrationTests =
  process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY;

const describeIf = shouldRunIntegrationTests ? describe : describe.skip;

describeIf("MinIO Integration Tests", () => {
  let provider: MinioProvider;
  let privateProvider: MinioProvider;
  const testBucket = process.env.MINIO_BUCKET || "strapi-boiler";

  const config = validateAndNormalizeConfig({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "test-key",
    secretKey: process.env.MINIO_SECRET_KEY || "test-secret",
    bucket: testBucket,
    folder: process.env.MINIO_FOLDER || "cms",
    private: false,
    expiry: parseInt(process.env.MINIO_EXPIRY || "604800"),
  });

  const privateConfig = {
    ...config,
    private: true,
  };

  beforeAll(() => {
    provider = new MinioProvider(config);
    privateProvider = new MinioProvider(privateConfig);
  });

  describe("Public file operations", () => {
    const testFile: StrapiFile = {
      name: "test-integration.jpg",
      hash: `test-${Date.now()}`,
      ext: ".jpg",
      mime: "image/jpeg",
      size: 1024,
      provider: "minio",
      buffer: Buffer.from("test file content for integration testing"),
    };

    it("should upload a public file", async () => {
      await provider.upload(testFile);

      expect(testFile.url).toBeDefined();
      expect(testFile.url).toContain(testBucket);
      expect(testFile.url).toContain(testFile.hash);
      console.log("Uploaded file URL:", testFile.url);
    });

    it("should generate a signed URL for public file (even if not private)", async () => {
      const result = await provider.getSignedUrl(testFile);

      expect(result.url).toBeDefined();
      expect(result.url).toContain("signature");
      console.log("Signed URL:", result.url);
    });

    it("should generate a signed URL with custom expiry", async () => {
      const result = await provider.getSignedUrl(testFile, { expiresIn: 3600 });

      expect(result.url).toBeDefined();
      expect(result.url).toContain("signature");
      console.log("Signed URL (1 hour):", result.url);
    });

    it("should delete the uploaded file", async () => {
      await provider.delete(testFile);
      console.log("File deleted successfully");
    });
  });

  describe("Private file operations", () => {
    const testFile: StrapiFile = {
      name: "test-private.jpg",
      hash: `test-private-${Date.now()}`,
      ext: ".jpg",
      mime: "image/jpeg",
      size: 1024,
      provider: "minio",
      buffer: Buffer.from("test private file content"),
    };

    it("should confirm provider is private", () => {
      expect(privateProvider.isPrivate()).toBe(true);
      expect(provider.isPrivate()).toBe(false);
    });

    it("should upload a private file", async () => {
      await privateProvider.upload(testFile);

      expect(testFile.url).toBeDefined();
      expect(testFile.url).toContain(testBucket);
      expect(testFile.url).toContain(testFile.hash);
      console.log("Uploaded private file URL:", testFile.url);
    });

    it("should generate a signed URL for private file", async () => {
      const result = await privateProvider.getSignedUrl(testFile);

      expect(result.url).toBeDefined();
      expect(result.url).toContain("signature");
      expect(result.url).toContain("X-Amz-Algorithm");
      console.log("Private file signed URL:", result.url);
    });

    it("should generate a signed URL with custom expiry for private file", async () => {
      const result = await privateProvider.getSignedUrl(testFile, {
        expiresIn: 1800,
      });

      expect(result.url).toBeDefined();
      expect(result.url).toContain("signature");
      console.log("Private file signed URL (30 min):", result.url);
    });

    it("should delete the private file", async () => {
      await privateProvider.delete(testFile);
      console.log("Private file deleted successfully");
    });
  });

  describe("Error handling", () => {
    it("should throw error when trying to delete non-existent file", async () => {
      const nonExistentFile: StrapiFile = {
        name: "non-existent.jpg",
        hash: "non-existent-12345",
        ext: ".jpg",
        mime: "image/jpeg",
        size: 0,
        provider: "minio",
        url: `${config.useSSL ? "https" : "http"}://${config.endPoint}:${config.port}/${testBucket}/cms/non-existent-12345.jpg`,
      };

      await expect(provider.delete(nonExistentFile)).rejects.toThrow();
    });

    it("should throw error when trying to get signed URL without file URL", async () => {
      const fileWithoutUrl: StrapiFile = {
        name: "test.jpg",
        hash: "test123",
        ext: ".jpg",
        mime: "image/jpeg",
        size: 0,
        provider: "minio",
      };

      await expect(provider.getSignedUrl(fileWithoutUrl)).rejects.toThrow();
    });
  });
});

