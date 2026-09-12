import { Test } from "@nestjs/testing";

import { PermissionController } from "../permission.controller";
import { PermissionService } from "../permission.service";

/**
 * Test doubles for every collaborator PermissionController depends on.
 * Only the methods PermissionController actually calls are stubbed.
 */
export const createPermissionControllerMocks = () => ({
  permissionService: {
    getPermissions: jest.fn(),
    getPermissionById: jest.fn(),
    createPermission: jest.fn(),
    updatePermission: jest.fn(),
    deletePermission: jest.fn(),
  },
});

export type PermissionControllerMocks = ReturnType<
  typeof createPermissionControllerMocks
>;

/** Builds PermissionController through the Nest DI container with all deps mocked. */
export const buildPermissionController = async (
  mocks: PermissionControllerMocks,
): Promise<PermissionController> => {
  const moduleRef = await Test.createTestingModule({
    controllers: [PermissionController],
    providers: [
      { provide: PermissionService, useValue: mocks.permissionService },
    ],
  }).compile();

  return moduleRef.get<PermissionController>(PermissionController);
};

/** Boilerplate for a fresh controller + mocks per test. */
export const setupPermissionController = async () => {
  const mocks = createPermissionControllerMocks();
  const controller = await buildPermissionController(mocks);

  return { mocks, controller };
};

export const ACTIVE_USER_ID = "44444444-4444-4444-8444-444444444444";
export const PERMISSION_ID = "11111111-1111-4111-8111-111111111111";

/** A permission with roles as the service returns it. */
export const makePermissionWithRoles = (
  overrides: Record<string, unknown> = {},
) => ({
  id: PERMISSION_ID,
  name: "users.read",
  description: "Read users",
  roles: [{ id: "role-1", name: "ADMIN" }],
  ...overrides,
});

/** A paginated list response. */
export const makePaginatedPermissions = (
  overrides: Record<string, unknown> = {},
) => ({
  items: [makePermissionWithRoles()],
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
