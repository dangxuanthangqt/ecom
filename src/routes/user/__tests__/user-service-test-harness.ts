import { Test } from "@nestjs/testing";

import { SharedRoleRepository } from "@/repositories/role/shared-role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { HashingService } from "@/shared/services/hashing.service";

import { UserService } from "../user.service";

/**
 * Test doubles for every collaborator UserService depends on.
 * Only the methods UserService actually calls are stubbed.
 */
export const createUserServiceMocks = () => ({
  sharedUserRepository: {
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
  },
  sharedRoleRepository: {
    getAdminRoleId: jest.fn(),
    getClientRoleId: jest.fn(),
  },
  hashingService: {
    hash: jest.fn(),
  },
});

export type UserServiceMocks = ReturnType<typeof createUserServiceMocks>;

/** Builds UserService through the Nest DI container with all deps mocked. */
export const buildUserService = async (
  mocks: UserServiceMocks,
): Promise<UserService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      UserService,
      { provide: SharedUserRepository, useValue: mocks.sharedUserRepository },
      { provide: SharedRoleRepository, useValue: mocks.sharedRoleRepository },
      { provide: HashingService, useValue: mocks.hashingService },
    ],
  }).compile();

  return moduleRef.get<UserService>(UserService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupUserService = async () => {
  const mocks = createUserServiceMocks();
  const service = await buildUserService(mocks);

  return { mocks, service };
};

export const ADMIN_ROLE_ID = "11111111-1111-4111-8111-111111111111";
export const CLIENT_ROLE_ID = "22222222-2222-4222-8222-222222222222";
export const SELLER_ROLE_ID = "33333333-3333-4333-8333-333333333333";
export const ACTIVE_USER_ID = "44444444-4444-4444-8444-444444444444";
export const TARGET_USER_ID = "55555555-5555-4555-8555-555555555555";

/** A persisted user row as the repositories return it. */
export const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: TARGET_USER_ID,
  name: "John Doe",
  email: "user@example.com",
  phoneNumber: "0987654321",
  avatar: null,
  status: "ACTIVE",
  role: { id: CLIENT_ROLE_ID, name: "CLIENT" },
  ...overrides,
});

/** Both role lookups resolve; admin and client ids are distinct by construction. */
export const stubRoleIds = (mocks: UserServiceMocks) => {
  mocks.sharedRoleRepository.getAdminRoleId.mockResolvedValue(ADMIN_ROLE_ID);
  mocks.sharedRoleRepository.getClientRoleId.mockResolvedValue(CLIENT_ROLE_ID);
};

/**
 * ForbiddenException is built from a `{ message, field }` detail object, which
 * becomes the response body verbatim — there is no `statusCode` inside it.
 * Assert on the status plus the detail payload.
 */
export const expectForbidden = async (
  promise: Promise<unknown>,
  message: string,
) =>
  expect(promise).rejects.toMatchObject({
    status: 403,
    response: { message },
  });

/**
 * `expect.objectContaining` typed back to the shape it matches, so nesting one
 * matcher inside another stays free of `any` leaking into the assertion.
 */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

/** `expect.any(Date)` typed as a Date, for the same reason as `containing`. */
export const anyDate = (): Date => expect.any(Date) as unknown as Date;

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
