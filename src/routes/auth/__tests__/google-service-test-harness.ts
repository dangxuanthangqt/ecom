import { Test } from "@nestjs/testing";

import { DeviceRepository } from "@/repositories/device/device.repository";
import { SharedRoleRepository } from "@/repositories/role/shared-role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { AppConfigService } from "@/shared/services/app-config.service";
import { HashingService } from "@/shared/services/hashing.service";

import { AuthService } from "../auth.service";
import { GoogleService } from "../google.service";

/**
 * Test doubles for every collaborator GoogleService depends on.
 * Only the methods GoogleService actually calls are stubbed.
 */
export const createGoogleServiceMocks = () => ({
  appConfigService: {
    appConfig: {
      googleClientId: "test-client-id",
      googleClientSecret: "test-client-secret",
      googleRedirectUri: "http://localhost:3000/auth/google/callback",
    },
  },
  sharedUserRepository: {
    findFirst: jest.fn(),
    createUser: jest.fn(),
  },
  hashingService: {
    hash: jest.fn(),
  },
  sharedRoleRepository: {
    getClientRoleId: jest.fn(),
  },
  deviceRepository: {
    createDevice: jest.fn(),
  },
  authService: {
    generateTokens: jest.fn(),
  },
});

export type GoogleServiceMocks = ReturnType<typeof createGoogleServiceMocks>;

/** Builds GoogleService through the Nest DI container with all deps mocked. */
export const buildGoogleService = async (
  mocks: GoogleServiceMocks,
): Promise<GoogleService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      GoogleService,
      { provide: AppConfigService, useValue: mocks.appConfigService },
      {
        provide: SharedUserRepository,
        useValue: mocks.sharedUserRepository,
      },
      { provide: HashingService, useValue: mocks.hashingService },
      { provide: SharedRoleRepository, useValue: mocks.sharedRoleRepository },
      { provide: DeviceRepository, useValue: mocks.deviceRepository },
      { provide: AuthService, useValue: mocks.authService },
    ],
  }).compile();

  return moduleRef.get<GoogleService>(GoogleService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupGoogleService = async () => {
  const mocks = createGoogleServiceMocks();
  const service = await buildGoogleService(mocks);

  return { mocks, service };
};

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const DEVICE_ID = "22222222-2222-4222-8222-222222222222";
export const ROLE_ID = "33333333-3333-4333-8333-333333333333";
export const ROLE_NAME = "CLIENT";

/** A persisted user row as the repository returns it. */
export const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  email: "user@example.com",
  name: "John Doe",
  password: "hashed-password",
  phoneNumber: "",
  roleId: ROLE_ID,
  totpSecret: null,
  deletedAt: null,
  role: { id: ROLE_ID, name: ROLE_NAME },
  ...overrides,
});

/** A persisted device row as the repository returns it. */
export const makeDevice = (overrides: Record<string, unknown> = {}) => ({
  id: DEVICE_ID,
  userId: USER_ID,
  userAgent: "Mozilla/5.0",
  ip: "192.168.1.1",
  isActive: true,
  createdAt: new Date(),
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
