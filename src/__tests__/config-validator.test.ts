import { validateAndNormalizeConfig } from "../utils/config-validator";
import { ConfigurationError } from "../errors/provider-errors";
import { ProviderOptions } from "../index.types";

describe("config-validator", () => {
  const validConfig: ProviderOptions = {
    endPoint: "localhost",
    accessKey: "minioadmin",
    secretKey: "minioadmin",
    bucket: "test-bucket",
  };

  describe("validateAndNormalizeConfig", () => {
    it("should validate and normalize a valid configuration", () => {
      const config = validateAndNormalizeConfig(validConfig);

      expect(config.endPoint).toBe("localhost");
      expect(config.port).toBe(9000); // default
      expect(config.useSSL).toBe(false);
      expect(config.accessKey).toBe("minioadmin");
      expect(config.secretKey).toBe("minioadmin");
      expect(config.bucket).toBe("test-bucket");
      expect(config.folder).toBe("");
      expect(config.private).toBe(false);
      expect(config.expiry).toBe(7 * 24 * 60 * 60); // default 7 days
    });

    it("should normalize boolean strings", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        useSSL: "true",
        private: "true",
      });

      expect(config.useSSL).toBe(true);
      expect(config.private).toBe(true);
    });

    it("should use custom port when provided", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        port: 9001,
      });

      expect(config.port).toBe(9001);
    });

    it("should use custom folder when provided", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        folder: "uploads",
      });

      expect(config.folder).toBe("uploads");
    });

    it("should use custom expiry when provided", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        expiry: 3600,
      });

      expect(config.expiry).toBe(3600);
    });

    it("should trim whitespace from string values", () => {
      const config = validateAndNormalizeConfig({
        endPoint: "  localhost  ",
        accessKey: "  minioadmin  ",
        secretKey: "  minioadmin  ",
        bucket: "  test-bucket  ",
        folder: "  uploads  ",
      });

      expect(config.endPoint).toBe("localhost");
      expect(config.accessKey).toBe("minioadmin");
      expect(config.secretKey).toBe("minioadmin");
      expect(config.bucket).toBe("test-bucket");
      expect(config.folder).toBe("uploads");
    });

    it("should throw ConfigurationError when endPoint is missing", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          endPoint: undefined as any,
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when accessKey is missing", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          accessKey: undefined as any,
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when secretKey is missing", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          secretKey: undefined as any,
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when bucket is missing", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          bucket: undefined as any,
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when port is invalid", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          port: 0,
        });
      }).toThrow(ConfigurationError);

      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          port: 65536,
        });
      }).toThrow(ConfigurationError);

      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          port: 1.5,
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when expiry is invalid", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          expiry: -1,
        });
      }).toThrow(ConfigurationError);

      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          expiry: 0,
        });
      }).toThrow(ConfigurationError);

      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          expiry: 1.5,
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when endPoint is empty after trim", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          endPoint: "   ",
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when accessKey is empty after trim", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          accessKey: "   ",
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when secretKey is empty after trim", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          secretKey: "   ",
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when bucket is empty after trim", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          bucket: "   ",
        });
      }).toThrow(ConfigurationError);
    });

    it("should accept valid hostname", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        endPoint: "example.com",
      });
      expect(config.endPoint).toBe("example.com");
    });

    it("should accept localhost", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        endPoint: "localhost",
      });
      expect(config.endPoint).toBe("localhost");
    });

    it("should accept valid IPv4 address", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        endPoint: "192.168.1.1",
      });
      expect(config.endPoint).toBe("192.168.1.1");
    });

    it("should accept valid IPv6 address", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        endPoint: "::1",
      });
      expect(config.endPoint).toBe("::1");
    });

    it("should throw ConfigurationError for invalid hostname", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          endPoint: "invalid..hostname",
        });
      }).toThrow(ConfigurationError);
    });

    it("should accept valid bucket name", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        bucket: "my-bucket-123",
      });
      expect(config.bucket).toBe("my-bucket-123");
    });

    it("should throw ConfigurationError for bucket name shorter than 3 characters", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          bucket: "ab",
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError for bucket name longer than 63 characters", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          bucket: "a".repeat(64),
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError for bucket name starting with hyphen", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          bucket: "-invalid-bucket",
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError for bucket name ending with hyphen", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          bucket: "invalid-bucket-",
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError for bucket name as IP address", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          bucket: "192.168.1.1",
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError for bucket name with consecutive dots", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          bucket: "invalid..bucket",
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError for bucket name with uppercase letters", () => {
      expect(() => {
        validateAndNormalizeConfig({
          ...validConfig,
          bucket: "Invalid-Bucket",
        });
      }).toThrow(ConfigurationError);
    });
  });
});

