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
      expect(config.connectTimeout).toBe(60000); // default 60 seconds
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

    it("should convert string expiry to number", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        expiry: "604800",
      });

      expect(config.expiry).toBe(604800);
    });

    it("should convert string port to number", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        port: "9001",
      });

      expect(config.port).toBe(9001);
    });

    it("should convert string expiry with whitespace to number", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        expiry: "  3600  ",
      });

      expect(config.expiry).toBe(3600);
    });

    it("should convert string port with whitespace to number", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        port: "  9001  ",
      });

      expect(config.port).toBe(9001);
    });

    it("should use default expiry when string is not a valid number", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const config = validateAndNormalizeConfig({
        ...validConfig,
        expiry: "not-a-number",
      });

      expect(config.expiry).toBe(7 * 24 * 60 * 60); // default 7 days
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid expiry value")
      );
      consoleSpy.mockRestore();
    });

    it("should use default port when string is not a valid number", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const config = validateAndNormalizeConfig({
        ...validConfig,
        port: "not-a-number",
      });

      expect(config.port).toBe(9000); // default port
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid port value")
      );
      consoleSpy.mockRestore();
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

    it("should use default port when port is invalid", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const config1 = validateAndNormalizeConfig({
        ...validConfig,
        port: 0,
      });
      expect(config1.port).toBe(9000); // default
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Port 0 is out of valid range")
      );

      const config2 = validateAndNormalizeConfig({
        ...validConfig,
        port: 65536,
      });
      expect(config2.port).toBe(9000); // default
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Port 65536 is out of valid range")
      );

      const config3 = validateAndNormalizeConfig({
        ...validConfig,
        port: 1.5,
      });
      expect(config3.port).toBe(9000); // default
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Port 1.5 is out of valid range")
      );

      consoleSpy.mockRestore();
    });

    it("should use default expiry when expiry is invalid", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const config1 = validateAndNormalizeConfig({
        ...validConfig,
        expiry: -1,
      });
      expect(config1.expiry).toBe(7 * 24 * 60 * 60); // default 7 days
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Expiry -1 is invalid")
      );

      const config2 = validateAndNormalizeConfig({
        ...validConfig,
        expiry: 0,
      });
      expect(config2.expiry).toBe(7 * 24 * 60 * 60); // default 7 days
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Expiry 0 is invalid")
      );

      const config3 = validateAndNormalizeConfig({
        ...validConfig,
        expiry: 1.5,
      });
      expect(config3.expiry).toBe(7 * 24 * 60 * 60); // default 7 days
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Expiry 1.5 is invalid")
      );

      consoleSpy.mockRestore();
    });

    it("should use custom connectTimeout when provided", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        connectTimeout: 30000,
      });

      expect(config.connectTimeout).toBe(30000);
    });

    it("should convert string connectTimeout to number", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        connectTimeout: "45000",
      });

      expect(config.connectTimeout).toBe(45000);
    });

    it("should convert string connectTimeout with whitespace to number", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        connectTimeout: "  30000  ",
      });

      expect(config.connectTimeout).toBe(30000);
    });

    it("should use default connectTimeout when string is not a valid number", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const config = validateAndNormalizeConfig({
        ...validConfig,
        connectTimeout: "not-a-number",
      });

      expect(config.connectTimeout).toBe(60000); // default 60 seconds
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid connectTimeout value")
      );
      consoleSpy.mockRestore();
    });

    it("should use default connectTimeout when connectTimeout is invalid", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const config1 = validateAndNormalizeConfig({
        ...validConfig,
        connectTimeout: -1,
      });
      expect(config1.connectTimeout).toBe(60000); // default
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid connectTimeout value")
      );

      const config2 = validateAndNormalizeConfig({
        ...validConfig,
        connectTimeout: 0,
      });
      expect(config2.connectTimeout).toBe(60000); // default
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid connectTimeout value")
      );

      consoleSpy.mockRestore();
    });

    it("should use default connectTimeout when not provided", () => {
      const config = validateAndNormalizeConfig(validConfig);
      expect(config.connectTimeout).toBe(60000); // default 60 seconds
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

    it("should accept IPv6 address ending with ::", () => {
      const config1 = validateAndNormalizeConfig({
        ...validConfig,
        endPoint: "2001:db8::",
      });
      expect(config1.endPoint).toBe("2001:db8::");

      const config2 = validateAndNormalizeConfig({
        ...validConfig,
        endPoint: "fe80::",
      });
      expect(config2.endPoint).toBe("fe80::");
    });

    it("should accept IPv6 address with compression in the middle", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        endPoint: "2001:db8::8a2e:370:7334",
      });
      expect(config.endPoint).toBe("2001:db8::8a2e:370:7334");
    });

    it("should accept full IPv6 address", () => {
      const config = validateAndNormalizeConfig({
        ...validConfig,
        endPoint: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
      });
      expect(config.endPoint).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
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

