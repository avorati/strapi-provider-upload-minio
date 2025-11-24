import {
  buildUploadPath,
  extractFilePathFromUrl,
} from "../utils/path-builder";
import { StrapiFile } from "../index.types";
import { PathTraversalError } from "../errors/provider-errors";

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

    it("should prevent path traversal attacks in folder", () => {
      expect(() => {
        buildUploadPath(baseFile, "../../../etc");
      }).toThrow(PathTraversalError);
    });

    it("should prevent path traversal attacks in file path", () => {
      const file = { ...baseFile, path: "../../../etc" };
      expect(() => {
        buildUploadPath(file, "uploads");
      }).toThrow(PathTraversalError);
    });

    it("should prevent path traversal attacks in hash", () => {
      const file = { ...baseFile, hash: "../../../etc/passwd" };
      expect(() => {
        buildUploadPath(file, "uploads");
      }).toThrow(PathTraversalError);
    });

    it("should prevent absolute paths starting with slash", () => {
      expect(() => {
        buildUploadPath(baseFile, "/etc/passwd");
      }).toThrow(PathTraversalError);
    });

    it("should prevent absolute paths starting with backslash", () => {
      expect(() => {
        buildUploadPath(baseFile, "\\windows\\system32");
      }).toThrow(PathTraversalError);
    });

    it("should sanitize double slashes", () => {
      const path = buildUploadPath(baseFile, "uploads//images");
      expect(path).toBe("uploads/images/abc123.jpg");
    });

    it("should sanitize mixed slashes", () => {
      const file = { ...baseFile, path: "2024\\01" };
      const path = buildUploadPath(file, "uploads");
      expect(path).toBe("uploads/2024/01/abc123.jpg");
    });

    it("should trim whitespace from folder", () => {
      const path = buildUploadPath(baseFile, "  uploads  ");
      expect(path).toBe("uploads/abc123.jpg");
    });

    it("should handle extension without leading dot", () => {
      const file = { ...baseFile, ext: "jpg" };
      const path = buildUploadPath(file, "uploads");
      expect(path).toBe("uploads/abc123.jpg");
    });

    it("should throw error for missing hash", () => {
      const file = { ...baseFile, hash: "" };
      expect(() => {
        buildUploadPath(file, "uploads");
      }).toThrow(PathTraversalError);
    });

    it("should throw error for missing extension", () => {
      const file = { ...baseFile, ext: "" };
      expect(() => {
        buildUploadPath(file, "uploads");
      }).toThrow(PathTraversalError);
    });

    it("should remove null bytes from paths", () => {
      const file = { ...baseFile, path: "2024" + "\x00" + "abc" };
      const path = buildUploadPath(file, "uploads");
      expect(path).toBe("uploads/2024abc/abc123.jpg");
    });

    it("should remove control characters from paths", () => {
      const file = { ...baseFile, path: "2024\x1Fabc" };
      const path = buildUploadPath(file, "uploads");
      expect(path).toBe("uploads/2024abc/abc123.jpg");
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

    it("should extract file path from signed URL with query parameters", () => {
      const signedUrl =
        "http://localhost:9000/test-bucket/uploads/abc123.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test%2F20251124%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20251124T020616Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=test123";
      const path = extractFilePathFromUrl(
        signedUrl,
        "http://localhost:9000/",
        "test-bucket"
      );
      expect(path).toBe("uploads/abc123.jpg");
    });

    it("should extract file path from URL with encoded query parameters", () => {
      const urlWithEncodedQuery =
        "http://localhost:9000/test-bucket/memory/file.jpg%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256";
      const path = extractFilePathFromUrl(
        urlWithEncodedQuery,
        "http://localhost:9000/",
        "test-bucket"
      );
      expect(path).toBe("memory/file.jpg");
    });

    it("should extract file path from URL with fragment", () => {
      const urlWithFragment =
        "http://localhost:9000/test-bucket/uploads/file.jpg#section";
      const path = extractFilePathFromUrl(
        urlWithFragment,
        "http://localhost:9000/",
        "test-bucket"
      );
      expect(path).toBe("uploads/file.jpg");
    });

    it("should extract file path from signed URL with both query and fragment", () => {
      const signedUrl =
        "http://localhost:9000/test-bucket/file.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256#fragment";
      const path = extractFilePathFromUrl(
        signedUrl,
        "http://localhost:9000/",
        "test-bucket"
      );
      expect(path).toBe("file.jpg");
    });
  });
});

