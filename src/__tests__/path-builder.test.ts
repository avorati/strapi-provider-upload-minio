import {
  buildUploadPath,
  extractFilePathFromUrl,
} from "../utils/path-builder";
import { StrapiFile } from "../index.types";

describe("path-builder", () => {
  const baseFile: StrapiFile = {
    name: "test.jpg",
    hash: "abc123",
    ext: ".jpg",
    mime: "image/jpeg",
    size: 1024,
    provider: "minio",
  };

  describe("buildUploadPath", () => {
    it("should build path without folder", () => {
      const path = buildUploadPath(baseFile, "");
      expect(path).toBe("abc123.jpg");
    });

    it("should build path with folder", () => {
      const path = buildUploadPath(baseFile, "uploads");
      expect(path).toBe("uploads/abc123.jpg");
    });

    it("should build path with folder and file path", () => {
      const file = { ...baseFile, path: "2024/01" };
      const path = buildUploadPath(file, "uploads");
      expect(path).toBe("uploads/2024/01/abc123.jpg");
    });

    it("should handle nested folders", () => {
      const path = buildUploadPath(baseFile, "uploads/images");
      expect(path).toBe("uploads/images/abc123.jpg");
    });
  });

  describe("extractFilePathFromUrl", () => {
    it("should extract file path from URL", () => {
      const path = extractFilePathFromUrl(
        "http://localhost:9000/test-bucket/uploads/abc123.jpg",
        "http://localhost:9000/",
        "test-bucket"
      );
      expect(path).toBe("uploads/abc123.jpg");
    });

    it("should extract file path without folder", () => {
      const path = extractFilePathFromUrl(
        "http://localhost:9000/test-bucket/abc123.jpg",
        "http://localhost:9000/",
        "test-bucket"
      );
      expect(path).toBe("abc123.jpg");
    });

    it("should throw error for empty URL", () => {
      expect(() => {
        extractFilePathFromUrl("", "http://localhost:9000/", "test-bucket");
      }).toThrow("File URL is required for path extraction");
    });
  });
});

