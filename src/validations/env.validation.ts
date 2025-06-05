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
  @IsIn([AppEnv.DEVELOPMENT, AppEnv.PRODUCTION])
  APP_ENV: string;

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
