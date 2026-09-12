import { Test } from "@nestjs/testing";

import { AppConfigService } from "@/shared/services/app-config.service";

import { AuthController } from "../auth.controller";
import { AuthService } from "../auth.service";
import { GoogleService } from "../google.service";

/**
 * Test doubles for every collaborator AuthController depends on.
 * Only the methods AuthController actually calls are stubbed.
 */
export const createAuthControllerMocks = () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    sendOTP: jest.fn(),
    forgotPassword: jest.fn(),
    setupTwoFactorAuthentication: jest.fn(),
    disableTwoFactorAuthentication: jest.fn(),
  },
  googleService: {
    getAuthorizationUrl: jest.fn(),
    googleCallback: jest.fn(),
  },
  appConfigService: {
    appConfig: {
      googleRedirectClientUri: "http://localhost:3000/auth/callback",
    },
  },
});

export type AuthControllerMocks = ReturnType<typeof createAuthControllerMocks>;

/** Builds AuthController through the Nest DI container with all deps mocked. */
export const buildAuthController = async (
  mocks: AuthControllerMocks,
): Promise<AuthController> => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      { provide: AuthService, useValue: mocks.authService },
      { provide: GoogleService, useValue: mocks.googleService },
      { provide: AppConfigService, useValue: mocks.appConfigService },
    ],
  }).compile();

  return moduleRef.get<AuthController>(AuthController);
};

/** Boilerplate for a fresh controller + mocks per test. */
export const setupAuthController = async () => {
  const mocks = createAuthControllerMocks();
  const controller = await buildAuthController(mocks);

  return { mocks, controller };
};

export const ACTIVE_USER_ID = "44444444-4444-4444-8444-444444444444";

/** A register response as the service returns it. */
export const makeRegisterResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  id: "11111111-1111-4111-8111-111111111111",
  email: "user@example.com",
  name: "John Doe",
  ...overrides,
});

/** A login response as the service returns it. */
export const makeLoginResponse = (overrides: Record<string, unknown> = {}) => ({
  accessToken: "access-token-123",
  refreshToken: "refresh-token-456",
  ...overrides,
});

/** An OTP response as the service returns it. */
export const makeSendOTPResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  message: "OTP sent to email",
  ...overrides,
});

/**
 * `expect.objectContaining` typed back to the shape it matches, so nesting one
 * matcher inside another stays free of `any` leaking into the assertion.
 */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
