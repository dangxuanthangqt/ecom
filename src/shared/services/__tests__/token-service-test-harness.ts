import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";

import { AppConfigService } from "../app-config.service";
import { TokenService } from "../token.service";

export const createTokenServiceMocks = () => ({
  appConfigService: {
    appConfig: {
      accessTokenConfig: {
        secretKey: "access-secret-key",
        expiresIn: "15m",
      },
      refreshTokenConfig: {
        secretKey: "refresh-secret-key",
        expiresIn: "7d",
      },
    },
  },
  jwtService: {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  },
});

export type TokenServiceMocks = ReturnType<typeof createTokenServiceMocks>;

export const buildTokenService = async (
  mocks: TokenServiceMocks,
): Promise<TokenService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      TokenService,
      { provide: AppConfigService, useValue: mocks.appConfigService },
      { provide: JwtService, useValue: mocks.jwtService },
    ],
  }).compile();

  return moduleRef.get<TokenService>(TokenService);
};

export const setupTokenService = async () => {
  const mocks = createTokenServiceMocks();
  const service = await buildTokenService(mocks);

  return { mocks, service };
};

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const makeAccessTokenPayload = (
  overrides: Record<string, unknown> = {},
) => ({
  userId: "user-123",
  deviceId: "device-456",
  roleId: "role-admin",
  roleName: "ADMIN",
  ...overrides,
});

export const makeRefreshTokenPayload = (
  overrides: Record<string, unknown> = {},
) => ({
  userId: "user-123",
  ...overrides,
});
