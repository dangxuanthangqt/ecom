import "reflect-metadata";

import { AppEnv } from "@/constants/env.constant";

import { validateEnv } from "../env.validation";

describe("validateEnv", () => {
  const createValidConfig = () => ({
    NODE_ENV: AppEnv.DEVELOPMENT,
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    PORT: 3000,
    ACCESS_TOKEN_SECRET: "secret-key",
    ACCESS_TOKEN_EXPIRES_IN: "7d",
    REFRESH_TOKEN_SECRET: "refresh-secret",
    REFRESH_TOKEN_EXPIRES_IN: "30d",
    SECRET_API_KEY: "api-key",
    OTP_EXPIRES_IN: "5m",
    RESEND_API_KEY: "resend-key",
    S3_REGION: "us-east-1",
    S3_ACCESS_KEY: "access-key",
    S3_SECRET_KEY: "secret-key",
    S3_BUCKET_NAME: "bucket-name",
  });

  type ValidConfig = ReturnType<typeof createValidConfig>;

  it("validates correct environment configuration", () => {
    // Act
    const result = validateEnv(createValidConfig());

    // Assert
    expect(result).toBeDefined();
    expect(result.NODE_ENV).toBe(AppEnv.DEVELOPMENT);
    expect(result.DATABASE_URL).toBe(
      "postgresql://user:pass@localhost:5432/db",
    );
    expect(result.PORT).toBe(3000);
  });

  it("accepts production environment", () => {
    // Arrange
    const config = {
      ...createValidConfig(),
      NODE_ENV: AppEnv.PRODUCTION,
    };

    // Act
    const result = validateEnv(config);

    // Assert
    expect(result.NODE_ENV).toBe(AppEnv.PRODUCTION);
  });

  it("throws error for invalid NODE_ENV value", () => {
    // Arrange
    const config = {
      ...createValidConfig(),
      NODE_ENV: "staging",
    };

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for missing NODE_ENV", () => {
    // Arrange
    const config = createValidConfig() as Partial<ValidConfig>;
    delete config.NODE_ENV;

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for missing DATABASE_URL", () => {
    // Arrange
    const config = createValidConfig() as Partial<ValidConfig>;
    delete config.DATABASE_URL;

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for PORT below minimum (0)", () => {
    // Arrange
    const config = {
      ...createValidConfig(),
      PORT: -1,
    };

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for PORT above maximum (65535)", () => {
    // Arrange
    const config = {
      ...createValidConfig(),
      PORT: 65536,
    };

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("accepts PORT at minimum boundary (0)", () => {
    // Arrange
    const config = {
      ...createValidConfig(),
      PORT: 0,
    };

    // Act
    const result = validateEnv(config);

    // Assert
    expect(result.PORT).toBe(0);
  });

  it("accepts PORT at maximum boundary (65535)", () => {
    // Arrange
    const config = {
      ...createValidConfig(),
      PORT: 65535,
    };

    // Act
    const result = validateEnv(config);

    // Assert
    expect(result.PORT).toBe(65535);
  });

  it("throws error for missing ACCESS_TOKEN_SECRET", () => {
    // Arrange
    const config = createValidConfig() as Partial<ValidConfig>;
    delete config.ACCESS_TOKEN_SECRET;

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for missing REFRESH_TOKEN_SECRET", () => {
    // Arrange
    const config = createValidConfig() as Partial<ValidConfig>;
    delete config.REFRESH_TOKEN_SECRET;

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for missing S3_REGION", () => {
    // Arrange
    const config = createValidConfig() as Partial<ValidConfig>;
    delete config.S3_REGION;

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for missing S3_ACCESS_KEY", () => {
    // Arrange
    const config = createValidConfig() as Partial<ValidConfig>;
    delete config.S3_ACCESS_KEY;

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for missing S3_SECRET_KEY", () => {
    // Arrange
    const config = createValidConfig() as Partial<ValidConfig>;
    delete config.S3_SECRET_KEY;

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for missing S3_BUCKET_NAME", () => {
    // Arrange
    const config = createValidConfig() as Partial<ValidConfig>;
    delete config.S3_BUCKET_NAME;

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("allows optional LOG_PRETTY to be omitted", () => {
    // Arrange
    const baseConfig = createValidConfig();
    const config = { ...baseConfig } as Record<string, unknown>;
    delete config.LOG_PRETTY;

    // Act
    const result = validateEnv(config);

    // Assert
    expect(result).toBeDefined();
  });

  it("allows optional LOG_LEVEL to be omitted", () => {
    // Arrange
    const baseConfig = createValidConfig();
    const config = { ...baseConfig } as Record<string, unknown>;
    delete config.LOG_LEVEL;

    // Act
    const result = validateEnv(config);

    // Assert
    expect(result).toBeDefined();
  });

  it("accepts provided optional LOG_PRETTY", () => {
    // Arrange
    const config = {
      ...createValidConfig(),
      LOG_PRETTY: "true",
    };

    // Act
    const result = validateEnv(config);

    // Assert
    expect(result.LOG_PRETTY).toBe("true");
  });

  it("accepts provided optional LOG_LEVEL", () => {
    // Arrange
    const config = {
      ...createValidConfig(),
      LOG_LEVEL: "debug",
    };

    // Act
    const result = validateEnv(config);

    // Assert
    expect(result.LOG_LEVEL).toBe("debug");
  });

  it("throws error when NODE_ENV is not a string", () => {
    // Arrange
    const config = {
      ...createValidConfig(),
      NODE_ENV: 123 as any,
    };

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for missing OTP_EXPIRES_IN", () => {
    // Arrange
    const config = createValidConfig() as Partial<ValidConfig>;
    delete config.OTP_EXPIRES_IN;

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("throws error for missing RESEND_API_KEY", () => {
    // Arrange
    const config = createValidConfig() as Partial<ValidConfig>;
    delete config.RESEND_API_KEY;

    // Act & Assert
    expect(() => validateEnv(config)).toThrow();
  });

  it("converts string PORT to number when enableImplicitConversion is true", () => {
    // Arrange
    const config = {
      ...createValidConfig(),
      PORT: "3000" as any,
    };

    // Act
    const result = validateEnv(config);

    // Assert
    expect(result.PORT).toBe(3000);
    expect(typeof result.PORT).toBe("number");
  });

  it("returns validated config with all required fields", () => {
    // Act
    const result = validateEnv(createValidConfig());

    // Assert
    expect(result).toHaveProperty("NODE_ENV");
    expect(result).toHaveProperty("DATABASE_URL");
    expect(result).toHaveProperty("PORT");
    expect(result).toHaveProperty("ACCESS_TOKEN_SECRET");
    expect(result).toHaveProperty("ACCESS_TOKEN_EXPIRES_IN");
    expect(result).toHaveProperty("REFRESH_TOKEN_SECRET");
    expect(result).toHaveProperty("REFRESH_TOKEN_EXPIRES_IN");
    expect(result).toHaveProperty("SECRET_API_KEY");
    expect(result).toHaveProperty("OTP_EXPIRES_IN");
    expect(result).toHaveProperty("RESEND_API_KEY");
    expect(result).toHaveProperty("S3_REGION");
    expect(result).toHaveProperty("S3_ACCESS_KEY");
    expect(result).toHaveProperty("S3_SECRET_KEY");
    expect(result).toHaveProperty("S3_BUCKET_NAME");
  });
});
