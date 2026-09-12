import { Test } from "@nestjs/testing";

import { RoleController } from "../role.controller";
import { RoleService } from "../role.service";

/**
 * Test doubles for every collaborator RoleController depends on.
 * Only the methods RoleController actually calls are stubbed.
 */
export const createRoleControllerMocks = () => ({
  roleService: {
    getRoles: jest.fn(),
    getRoleById: jest.fn(),
    createRole: jest.fn(),
    updateRole: jest.fn(),
    deleteRole: jest.fn(),
  },
});

export type RoleControllerMocks = ReturnType<typeof createRoleControllerMocks>;

/** Builds RoleController through the Nest DI container with all deps mocked. */
export const buildRoleController = async (
  mocks: RoleControllerMocks,
): Promise<RoleController> => {
  const moduleRef = await Test.createTestingModule({
    controllers: [RoleController],
    providers: [{ provide: RoleService, useValue: mocks.roleService }],
  }).compile();

  return moduleRef.get<RoleController>(RoleController);
};

/** Boilerplate for a fresh controller + mocks per test. */
export const setupRoleController = async () => {
  const mocks = createRoleControllerMocks();
  const controller = await buildRoleController(mocks);

  return { mocks, controller };
};

export const ACTIVE_USER_ID = "44444444-4444-4444-8444-444444444444";
export const ROLE_ID = "11111111-1111-4111-8111-111111111111";

/** A role with permissions as the service returns it. */
export const makeRoleWithPermissions = (
  overrides: Record<string, unknown> = {},
) => ({
  id: ROLE_ID,
  name: "ADMIN",
  description: "Administrator role",
  permissions: [
    { id: "perm-1", name: "users.read" },
    { id: "perm-2", name: "users.write" },
  ],
  ...overrides,
});

/** A paginated list response. */
export const makePaginatedRoles = (
  overrides: Record<string, unknown> = {},
) => ({
  items: [makeRoleWithPermissions()],
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
