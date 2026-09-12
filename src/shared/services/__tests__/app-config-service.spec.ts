import { setupAppConfigService } from "./app-config-service-test-harness";

describe("AppConfigService", () => {
  describe("initialization with valid config", () => {
    it("loads all required configuration values", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService();

      // Assert
      expect(service.appConfig).toBeDefined();
      expect(service.appConfig.appEnv).toBe("development");
      expect(service.appConfig.port).toBe(3000);
    });

    it("exposes appConfig property with correct type", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService();

      // Assert
      expect(service.appConfig).toBeDefined();
      expect(typeof service.appConfig).toBe("object");
      expect(service.appConfig.accessTokenConfig).toBeDefined();
    });

    it("loads JWT access token configuration", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService();

      // Assert
      expect(service.appConfig.accessTokenConfig).toEqual({
        secretKey: "access-secret",
        expiresIn: "15m",
      });
    });

    it("loads JWT refresh token configuration", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService();

      // Assert
      expect(service.appConfig.refreshTokenConfig).toEqual({
        secretKey: "refresh-secret",
        expiresIn: "7d",
      });
    });

    it("loads S3 configuration", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService();

      // Assert
      expect(service.appConfig.s3Region).toBe("us-east-1");
      expect(service.appConfig.s3AccessKey).toBe("s3-access-key");
      expect(service.appConfig.s3SecretKey).toBe("s3-secret-key");
      expect(service.appConfig.s3BucketName).toBe("test-bucket");
    });

    it("loads Redis configuration", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService();

      // Assert
      expect(service.appConfig.redisUrl).toBe("redis://localhost:6379");
    });

    it("loads Google OAuth configuration", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService();

      // Assert
      expect(service.appConfig.googleClientId).toBe("google-client-id");
      expect(service.appConfig.googleClientSecret).toBe("google-client-secret");
      expect(service.appConfig.googleRedirectUri).toContain(
        "/auth/google/callback",
      );
      expect(service.appConfig.googleRedirectClientUri).toBe(
        "http://localhost:3000",
      );
    });

    it("loads email and OTP configuration", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService();

      // Assert
      expect(service.appConfig.resendApiKey).toBe("resend-api-key");
      expect(service.appConfig.sandboxEmail).toBe("test@example.com");
      expect(service.appConfig.otpExpiresIn).toBe("300");
    });

    it("loads logging configuration", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService();

      // Assert
      expect(service.appConfig.logLevel).toBe("debug");
      expect(service.appConfig.logPretty).toBe(true);
    });
  });

  describe("appEnv getter", () => {
    it("returns app environment", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService();

      // Assert
      expect(service.appEnv).toBe("development");
    });

    it("returns production when NODE_ENV=production", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService({
        NODE_ENV: "production",
      });

      // Assert
      expect(service.appEnv).toBe("production");
    });
  });

  describe("isDevelopment getter", () => {
    it("returns true when NODE_ENV is development", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService({
        NODE_ENV: "development",
      });

      // Assert
      expect(service.isDevelopment).toBe(true);
    });

    it("returns false when NODE_ENV is production", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService({
        NODE_ENV: "production",
      });

      // Assert
      expect(service.isDevelopment).toBe(false);
    });

    it("returns false when NODE_ENV is staging", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService({ NODE_ENV: "staging" });

      // Assert
      expect(service.isDevelopment).toBe(false);
    });
  });

  describe("error handling - missing required values", () => {
    it("throws error when PORT is missing", async () => {
      // Arrange & Act & Assert
      await expect(
        setupAppConfigService({ PORT: undefined as never }),
      ).rejects.toThrow("PORT is not defined");
    });

    it("throws error when ACCESS_TOKEN_SECRET is missing", async () => {
      // Arrange & Act & Assert
      await expect(
        setupAppConfigService({ ACCESS_TOKEN_SECRET: undefined as never }),
      ).rejects.toThrow("ACCESS_TOKEN_SECRET is not defined");
    });

    it("throws error when S3 configuration is missing", async () => {
      // Arrange & Act & Assert
      await expect(
        setupAppConfigService({ S3_REGION: undefined as never }),
      ).rejects.toThrow("S3_REGION is not defined");
    });
  });

  describe("type validation", () => {
    it("throws error when PORT is not a valid number", async () => {
      // Arrange & Act & Assert
      await expect(
        setupAppConfigService({ PORT: "not-a-number" }),
      ).rejects.toThrow("PORT is not a number");
    });

    it("throws error when LOG_PRETTY is not valid boolean string", async () => {
      // Arrange & Act & Assert
      await expect(
        setupAppConfigService({ LOG_PRETTY: "not-a-boolean" }),
      ).rejects.toThrow("LOG_PRETTY is not a boolean");
    });

    it("parses true as boolean from JSON string", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService({ LOG_PRETTY: "true" });

      // Assert
      expect(service.appConfig.logPretty).toBe(true);
    });

    it("parses false as boolean from JSON string", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService({ LOG_PRETTY: "false" });

      // Assert
      expect(service.appConfig.logPretty).toBe(false);
    });

    it("parses PORT as number from string", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService({ PORT: "8080" });

      // Assert
      expect(service.appConfig.port).toBe(8080);
      expect(typeof service.appConfig.port).toBe("number");
    });
  });

  describe("string value handling", () => {
    it("replaces escaped newlines in string values", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService({
        ACCESS_TOKEN_SECRET: "line1\\nline2",
      });

      // Assert
      expect(service.appConfig.accessTokenConfig.secretKey).toBe(
        "line1\nline2",
      );
    });

    it("handles multiple escaped newlines", async () => {
      // Arrange & Act
      const { service } = await setupAppConfigService({
        ACCESS_TOKEN_SECRET: "start\\nmiddle\\nend",
      });

      // Assert
      expect(service.appConfig.accessTokenConfig.secretKey).toContain("\n");
      expect(service.appConfig.accessTokenConfig.secretKey).toBe(
        "start\nmiddle\nend",
      );
    });
  });

  describe("configuration isolation", () => {
    it("creates independent configurations per instance", async () => {
      // Arrange & Act
      const { service: service1 } = await setupAppConfigService({
        PORT: "3000",
      });
      const { service: service2 } = await setupAppConfigService({
        PORT: "4000",
      });

      // Assert
      expect(service1.appConfig.port).toBe(3000);
      expect(service2.appConfig.port).toBe(4000);
    });

    it("does not share configuration between instances", async () => {
      // Arrange & Act
      const { service: service1 } = await setupAppConfigService({
        NODE_ENV: "development",
      });
      const { service: service2 } = await setupAppConfigService({
        NODE_ENV: "production",
      });

      // Assert
      expect(service1.isDevelopment).toBe(true);
      expect(service2.isDevelopment).toBe(false);
    });
  });
});
