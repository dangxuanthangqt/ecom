import { Injectable } from "@nestjs/common";
import { isNil } from "@nestjs/common/utils/shared.utils";
import { ConfigService } from "@nestjs/config";

import { AppConfig, JwtConfig } from "@/types/config.type";

@Injectable()
export class AppConfigService {
  readonly appConfig: AppConfig;

  constructor(private readonly configService: ConfigService) {
    this.appConfig = this.getAppConfig();
  }

  private getAppConfig(): AppConfig {
    return {
      appEnv: this.getString("NODE_ENV"), // for specifying the file name of the environment variables
      port: this.getNumber("PORT"),
      accessTokenConfig: this.accessTokenConfig,
      refreshTokenConfig: this.refreshTokenConfig,
      logLevel: this.getString("LOG_LEVEL"),
      logPretty: this.getBoolean("LOG_PRETTY"),

      // Otp
      otpExpiresIn: this.getString("OTP_EXPIRES_IN"),
      resendApiKey: this.getString("RESEND_API_KEY"),
      sandboxEmail: this.getString("SANDBOX_EMAIL"),

      // Google
      googleClientId: this.getString("GOOGLE_CLIENT_ID"),
      googleClientSecret: this.getString("GOOGLE_CLIENT_SECRET"),
      googleRedirectUri: this.getString("GOOGLE_REDIRECT_URI"),
      googleRedirectClientUri: this.getString("GOOGLE_REDIRECT_CLIENT_URI"),

      // S3
      s3Region: this.getString("S3_REGION"),
      s3AccessKey: this.getString("S3_ACCESS_KEY"),
      s3SecretKey: this.getString("S3_SECRET_KEY"),
      s3BucketName: this.getString("S3_BUCKET_NAME"),
    };
  }

  private get accessTokenConfig(): JwtConfig {
    return {
      secretKey: this.getString("ACCESS_TOKEN_SECRET"),
      expiresIn: this.getString("ACCESS_TOKEN_EXPIRES_IN"),
    };
  }

  private get refreshTokenConfig(): JwtConfig {
    return {
      secretKey: this.getString("REFRESH_TOKEN_SECRET"),
      expiresIn: this.getString("REFRESH_TOKEN_EXPIRES_IN"),
    };
  }

  get appEnv(): string {
    return this.getString("NODE_ENV");
  }

  get isDevelopment(): boolean {
    return this.appEnv === "development";
  }

  private getBoolean(key: string): boolean {
    const value = this.get(key);

    try {
      return Boolean(JSON.parse(value));
    } catch {
      throw new Error(`AppConfigService: ${key} is not a boolean`);
    }
  }

  private getNumber(key: string): number {
    const value = this.get(key);

    if (isNaN(Number(value))) {
      throw new Error(`AppConfigService: ${key} is not a number`);
    }

    return Number(value);
  }

  private get(key: string): string {
    const value = this.configService.get<string>(key);

    if (isNil(value)) {
      throw new Error(`AppConfigService: ${key} is not defined`);
    }

    return value;
  }

  private getString(key: string): string {
    const value = this.get(key);

    return value.replaceAll("\\n", "\n");
  }
}
