import { Test } from "@nestjs/testing";

import { UserController } from "../user.controller";
import { UserService } from "../user.service";

/**
 * Test doubles for every collaborator UserController depends on.
 * Only the methods UserController actually calls are stubbed.
 */
export const createUserControllerMocks = () => ({
  userService: {
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
});

export type UserControllerMocks = ReturnType<typeof createUserControllerMocks>;

/** Builds UserController through the Nest DI container with all deps mocked. */
export const buildUserController = async (
  mocks: UserControllerMocks,
): Promise<UserController> => {
  const moduleRef = await Test.createTestingModule({
    controllers: [UserController],
    providers: [{ provide: UserService, useValue: mocks.userService }],
  }).compile();

  return moduleRef.get<UserController>(UserController);
};

/** Boilerplate for a fresh controller + mocks per test. */
export const setupUserController = async () => {
  const mocks = createUserControllerMocks();
  const controller = await buildUserController(mocks);

  return { mocks, controller };
};

export const ADMIN_ROLE_ID = "11111111-1111-4111-8111-111111111111";
export const ACTIVE_USER_ID = "44444444-4444-4444-8444-444444444444";
export const TARGET_USER_ID = "55555555-5555-4555-8555-555555555555";

/** A user item as the service returns it. */
export const makeUserItem = (overrides: Record<string, unknown> = {}) => ({
  id: TARGET_USER_ID,
  name: "John Doe",
  email: "user@example.com",
  phoneNumber: "0987654321",
  avatar: null,
  status: "ACTIVE",
  role: { id: ADMIN_ROLE_ID, name: "ADMIN" },
  ...overrides,
});

/** A paginated list response. */
export const makePaginatedUsers = (
  overrides: Record<string, unknown> = {},
) => ({
  items: [makeUserItem()],
  total: 1,
  page: 1,
  pageSize: 10,
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
