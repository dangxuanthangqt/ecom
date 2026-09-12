import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { AppConfigService } from "../app-config.service";

export const createAppConfigServiceMocks = () => ({
  configService: {
    get: jest.fn(),
  },
});

export type AppConfigServiceMocks = ReturnType<
  typeof createAppConfigServiceMocks
>;

export const buildAppConfigService = async (
  mocks: AppConfigServiceMocks,
): Promise<AppConfigService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AppConfigService,
      { provide: ConfigService, useValue: mocks.configService },
    ],
  }).compile();

  return moduleRef.get<AppConfigService>(AppConfigService);
};

export const setupAppConfigService = async (
  configOverrides: Record<string, string> = {},
) => {
  const mocks = createAppConfigServiceMocks();

  const defaultConfig: Record<string, string> = {
    NODE_ENV: "development",
    PORT: "3000",
    ACCESS_TOKEN_SECRET: "access-secret",
    ACCESS_TOKEN_EXPIRES_IN: "15m",
    REFRESH_TOKEN_SECRET: "refresh-secret",
    REFRESH_TOKEN_EXPIRES_IN: "7d",
    LOG_LEVEL: "debug",
    LOG_PRETTY: "true",
    OTP_EXPIRES_IN: "300",
    RESEND_API_KEY: "resend-api-key",
    SANDBOX_EMAIL: "test@example.com",
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/auth/google/callback",
    GOOGLE_REDIRECT_CLIENT_URI: "http://localhost:3000",
    S3_REGION: "us-east-1",
    S3_ACCESS_KEY: "s3-access-key",
    S3_SECRET_KEY: "s3-secret-key",
    S3_BUCKET_NAME: "test-bucket",
  };

  const config = { ...defaultConfig, ...configOverrides };

  mocks.configService.get.mockImplementation((key: string) => config[key]);

  const service = await buildAppConfigService(mocks);

  return { mocks, service, config };
};

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;
