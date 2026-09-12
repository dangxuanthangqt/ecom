import { Test } from "@nestjs/testing";

import { DeviceRepository } from "@/repositories/device/device.repository";
import { RefreshTokenRepository } from "@/repositories/refresh-token/refresh-token.repository";
import { SharedRoleRepository } from "@/repositories/role/shared-role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { UserRepository } from "@/repositories/user/user.repository";
import { VerificationCodeRepository } from "@/repositories/verification-code/verification-code.repository";
import { TwoFactorAuthenticationService } from "@/shared/services/2fa.service";
import { AppConfigService } from "@/shared/services/app-config.service";
import { HashingService } from "@/shared/services/hashing.service";
import { TokenService } from "@/shared/services/token.service";

import { AuthService } from "../auth.service";

/**
 * Test doubles for every collaborator AuthService depends on.
 * Only the methods AuthService actually calls are stubbed.
 */
export const createAuthServiceMocks = () => ({
  hashingService: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
  sharedRoleRepository: {
    getClientRoleId: jest.fn(),
  },
  tokenService: {
    signAccessToken: jest.fn(),
    signRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  },
  userRepository: {
    registerUser: jest.fn(),
    updateUser: jest.fn(),
  },
  sharedUserRepository: {
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  verificationCodeRepository: {
    findUnique: jest.fn(),
    createVerificationCode: jest.fn(),
    deleteVerificationCode: jest.fn(),
  },
  configService: {
    appConfig: { otpExpiresIn: "5m" },
  },
  refreshTokenRepository: {
    findUniqueOrThrow: jest.fn(),
    delete: jest.fn(),
    createRefreshToken: jest.fn(),
  },
  deviceRepository: {
    createDevice: jest.fn(),
    updateDevice: jest.fn(),
  },
  twoFactorAuthenticationService: {
    generateTOTPSecret: jest.fn(),
    verifyTOTPCode: jest.fn(),
  },
});

export type AuthServiceMocks = ReturnType<typeof createAuthServiceMocks>;

/** Builds AuthService through the Nest DI container with all deps mocked. */
export const buildAuthService = async (
  mocks: AuthServiceMocks,
): Promise<AuthService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: HashingService, useValue: mocks.hashingService },
      { provide: SharedRoleRepository, useValue: mocks.sharedRoleRepository },
      { provide: TokenService, useValue: mocks.tokenService },
      { provide: UserRepository, useValue: mocks.userRepository },
      { provide: SharedUserRepository, useValue: mocks.sharedUserRepository },
      {
        provide: VerificationCodeRepository,
        useValue: mocks.verificationCodeRepository,
      },
      { provide: AppConfigService, useValue: mocks.configService },
      {
        provide: RefreshTokenRepository,
        useValue: mocks.refreshTokenRepository,
      },
      { provide: DeviceRepository, useValue: mocks.deviceRepository },
      {
        provide: TwoFactorAuthenticationService,
        useValue: mocks.twoFactorAuthenticationService,
      },
    ],
  }).compile();

  return moduleRef.get<AuthService>(AuthService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupAuthService = async () => {
  const mocks = createAuthServiceMocks();
  const service = await buildAuthService(mocks);

  return { mocks, service };
};

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const DEVICE_ID = "22222222-2222-4222-8222-222222222222";
export const ROLE_ID = "33333333-3333-4333-8333-333333333333";
export const ROLE_NAME = "CLIENT";

/** A persisted user row as the repositories return it. */
export const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  email: "user@example.com",
  name: "John Doe",
  password: "hashed-password",
  phoneNumber: "0987654321",
  roleId: ROLE_ID,
  totpSecret: null,
  deletedAt: null,
  role: { id: ROLE_ID, name: ROLE_NAME },
  ...overrides,
});

export const makeVerificationCode = (
  overrides: Record<string, unknown> = {},
) => ({
  id: "44444444-4444-4444-8444-444444444444",
  email: "user@example.com",
  code: "123456",
  type: "REGISTER",
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  ...overrides,
});

/**
 * Wires tokenService + refreshTokenRepository so generateTokens resolves.
 * `exp` is the refresh token expiry in seconds since epoch.
 */
export const stubTokenGeneration = (
  mocks: AuthServiceMocks,
  exp = Math.floor(Date.now() / 1000) + 3600,
) => {
  mocks.tokenService.signAccessToken.mockReturnValue("access-token");
  mocks.tokenService.signRefreshToken.mockReturnValue("refresh-token");
  mocks.tokenService.verifyRefreshToken.mockResolvedValue({
    userId: USER_ID,
    exp,
  });
  mocks.refreshTokenRepository.createRefreshToken.mockResolvedValue({
    token: "refresh-token",
  });

  return exp;
};

/**
 * BadRequestException is thrown with an array payload, so its `message` is the
 * generic "Bad Request Exception". Assert on the detail payload instead.
 */
export const expectBadRequestDetail = async (
  promise: Promise<unknown>,
  detail: { message: string; field?: string },
) =>
  expect(promise).rejects.toMatchObject({
    response: {
      statusCode: 400,
      message: [detail],
    },
  });
