import { Test } from "@nestjs/testing";

import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { HashingService } from "@/shared/services/hashing.service";
import { PrismaService } from "@/shared/services/prisma.service";

import { ProfileService } from "../profile.service";

/**
 * Test doubles for every collaborator ProfileService depends on.
 * Only the methods ProfileService actually calls are stubbed.
 */
export const createProfileServiceMocks = () => ({
  sharedUserRepository: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    updateUser: jest.fn(),
  },
  prismaService: {
    $transaction: jest.fn(),
  },
  hashingService: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
});

export type ProfileServiceMocks = ReturnType<typeof createProfileServiceMocks>;

/** Builds ProfileService through the Nest DI container with all deps mocked. */
export const buildProfileService = async (
  mocks: ProfileServiceMocks,
): Promise<ProfileService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ProfileService,
      {
        provide: SharedUserRepository,
        useValue: mocks.sharedUserRepository,
      },
      {
        provide: PrismaService,
        useValue: mocks.prismaService,
      },
      {
        provide: HashingService,
        useValue: mocks.hashingService,
      },
    ],
  }).compile();

  return moduleRef.get<ProfileService>(ProfileService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupProfileService = async () => {
  const mocks = createProfileServiceMocks();
  const service = await buildProfileService(mocks);

  return { mocks, service };
};

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const ROLE_ID = "22222222-2222-4222-8222-222222222222";

/** A persisted user row as the repository returns it. */
export const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  name: "John Doe",
  email: "user@example.com",
  phoneNumber: "0987654321",
  avatar: null,
  status: "ACTIVE",
  password: "hashed-password",
  role: { id: ROLE_ID, name: "CLIENT" },
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
