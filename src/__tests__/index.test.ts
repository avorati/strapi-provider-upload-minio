import { ProviderOptions } from "../index.types";
import { MinioProvider } from "../provider/minio-provider";
import { ConfigurationError } from "../errors/provider-errors";

// Import as CommonJS module (as Strapi does)
const defaultExport = require("../index");

describe("index", () => {
  const validConfig: ProviderOptions = {
    endPoint: "localhost",
    port: 9000,
    useSSL: false,
    accessKey: "minioadmin",
    secretKey: "minioadmin",
    bucket: "test-bucket",
    folder: "uploads",
    private: false,
    expiry: 3600,
  };

  describe("init", () => {
    it("should initialize and return a provider object with required methods", () => {
      const provider = defaultExport.init(validConfig);

      expect(provider).toHaveProperty("upload");
      expect(provider).toHaveProperty("uploadStream");
      expect(provider).toHaveProperty("delete");
      expect(provider).toHaveProperty("isPrivate");
      expect(provider).toHaveProperty("getSignedUrl");
      expect(typeof provider.upload).toBe("function");
      expect(typeof provider.uploadStream).toBe("function");
      expect(typeof provider.delete).toBe("function");
      expect(typeof provider.isPrivate).toBe("function");
      expect(typeof provider.getSignedUrl).toBe("function");
    });

    it("should initialize provider with minimal required config", () => {
      const minimalConfig: ProviderOptions = {
        endPoint: "localhost",
        accessKey: "minioadmin",
        secretKey: "minioadmin",
        bucket: "test-bucket",
      };

      const provider = defaultExport.init(minimalConfig);

      expect(provider).toHaveProperty("upload");
      expect(provider).toHaveProperty("uploadStream");
      expect(provider).toHaveProperty("delete");
      expect(provider).toHaveProperty("isPrivate");
      expect(provider).toHaveProperty("getSignedUrl");
    });

    it("should throw ConfigurationError for invalid config", () => {
      const invalidConfig = {
        endPoint: "",
        accessKey: "minioadmin",
        secretKey: "minioadmin",
        bucket: "test-bucket",
      } as ProviderOptions;

      expect(() => {
        defaultExport.init(invalidConfig);
      }).toThrow(ConfigurationError);
    });

    it("should initialize provider with string boolean values", () => {
      const configWithStringBooleans: ProviderOptions = {
        endPoint: "localhost",
        accessKey: "minioadmin",
        secretKey: "minioadmin",
        bucket: "test-bucket",
        useSSL: "true" as any,
        private: "true" as any,
      };

      const provider = defaultExport.init(configWithStringBooleans);

      expect(provider).toHaveProperty("isPrivate");
      expect(typeof provider.isPrivate).toBe("function");
      expect(provider.isPrivate()).toBe(true);
    });

    it("should initialize provider with custom port and expiry", () => {
      const customConfig: ProviderOptions = {
        endPoint: "localhost",
        port: 9001,
        accessKey: "minioadmin",
        secretKey: "minioadmin",
        bucket: "test-bucket",
        expiry: 7200,
      };

      const provider = defaultExport.init(customConfig);

      expect(provider).toHaveProperty("upload");
      expect(provider).toHaveProperty("uploadStream");
      expect(provider).toHaveProperty("delete");
      expect(provider).toHaveProperty("isPrivate");
      expect(provider).toHaveProperty("getSignedUrl");
    });
  });
});
