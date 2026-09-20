import { plainToInstance } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from "class-validator";

import { AppEnv } from "@/constants/env.constant";

class EnvSchema {
  @IsString()
  @IsIn([AppEnv.DEVELOPMENT, AppEnv.PRODUCTION, AppEnv.TEST])
  NODE_ENV: string;

  @IsString()
  DATABASE_URL: string;

  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number;

  @IsString()
  ACCESS_TOKEN_SECRET: string;

  @IsString()
  ACCESS_TOKEN_EXPIRES_IN: string;

  @IsString()
  REFRESH_TOKEN_SECRET: string;

  @IsString()
  REFRESH_TOKEN_EXPIRES_IN: string;

  @IsString()
  SECRET_API_KEY: string;

  @IsOptional()
  @IsString()
  LOG_PRETTY: string;

  @IsOptional()
  @IsString()
  LOG_LEVEL: string;

  @IsString()
  OTP_EXPIRES_IN: string;

  /**
   * Turns every rate limiter off. Exists so the e2e suite can run hundreds of
   * requests from one address without tripping a limit it is not testing; the
   * rate-limit spec switches it back on for its own app instance. Leaving it
   * false in a deployed environment removes the only brute-force defence the
   * API has, so `AppModule` logs a warning at boot when it is not enabled.
   */
  @IsString()
  @IsIn(["true", "false"])
  THROTTLE_ENABLED: string;

  /**
   * How many reverse proxies sit in front of the app. It decides which entry of
   * `X-Forwarded-For` express believes, and therefore which address the rate
   * limiter counts against. Zero means "trust nothing": the socket address is
   * used and the header is ignored. Setting this higher than the real number of
   * proxies lets a caller spoof its own address and walk past every IP limit.
   */
  @IsNumber()
  @Min(0)
  @Max(10)
  TRUST_PROXY_HOPS: number;

  @IsString()
  RESEND_API_KEY: string;

  @IsString()
  S3_REGION: string;

  @IsString()
  S3_ACCESS_KEY: string;

  @IsString()
  S3_SECRET_KEY: string;

  @IsString()
  S3_BUCKET_NAME: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
