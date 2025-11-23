import {
  buildHostUrl,
  createFileUrl,
  isFileFromSameBucket,
} from "../utils/url-builder";
import { NormalizedConfig } from "../utils/config-validator";

describe("url-builder", () => {
  const baseConfig: NormalizedConfig = {
    endPoint: "localhost",
    port: 9000,
    useSSL: false,
    accessKey: "minioadmin",
    secretKey: "minioadmin",
    bucket: "test-bucket",
    folder: "",
    private: false,
    expiry: 3600,
  };

  describe("buildHostUrl", () => {
    it("should build HTTP URL with port", () => {
      const url = buildHostUrl(baseConfig);
      expect(url).toBe("http://localhost:9000/");
    });

    it("should build HTTPS URL with port", () => {
      const url = buildHostUrl({ ...baseConfig, useSSL: true });
      expect(url).toBe("https://localhost:9000/");
    });

    it("should omit port 80 for HTTP", () => {
      const url = buildHostUrl({ ...baseConfig, port: 80 });
      expect(url).toBe("http://localhost/");
    });

    it("should omit port 443 for HTTPS", () => {
      const url = buildHostUrl({
        ...baseConfig,
        useSSL: true,
        port: 443,
      });
      expect(url).toBe("https://localhost/");
    });

    it("should include port 80 for HTTPS (non-standard)", () => {
      const url = buildHostUrl({
        ...baseConfig,
        useSSL: true,
        port: 80,
      });
      expect(url).toBe("https://localhost:80/");
    });
  });

  describe("createFileUrl", () => {
    it("should create a file URL", () => {
      const url = createFileUrl(
        "uploads/file.jpg",
        "http://localhost:9000/",
        "test-bucket"
      );
      expect(url).toBe("http://localhost:9000/test-bucket/uploads/file.jpg");
    });
  });

  describe("isFileFromSameBucket", () => {
    it("should return true for file from same bucket", () => {
      const result = isFileFromSameBucket(
        "http://localhost:9000/test-bucket/uploads/file.jpg",
        "localhost",
        "test-bucket"
      );
      expect(result).toBe(true);
    });

    it("should return false for file from different host", () => {
      const result = isFileFromSameBucket(
        "http://otherhost:9000/test-bucket/uploads/file.jpg",
        "localhost",
        "test-bucket"
      );
      expect(result).toBe(false);
    });

    it("should return false for file from different bucket", () => {
      const result = isFileFromSameBucket(
        "http://localhost:9000/other-bucket/uploads/file.jpg",
        "localhost",
        "test-bucket"
      );
      expect(result).toBe(false);
    });

    it("should return false for undefined URL", () => {
      const result = isFileFromSameBucket(undefined, "localhost", "test-bucket");
      expect(result).toBe(false);
    });

    it("should return false for invalid URL", () => {
      const result = isFileFromSameBucket(
        "not-a-url",
        "localhost",
        "test-bucket"
      );
      expect(result).toBe(false);
    });
  });
});

