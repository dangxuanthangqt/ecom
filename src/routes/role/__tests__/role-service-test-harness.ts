import { Test } from "@nestjs/testing";

import { RoleRepository } from "@/repositories/role/role.repository";
import { RolePermissionCacheService } from "@/shared/services/role-permission-cache.service";

import { RoleService } from "../role.service";

/**
 * Test doubles for every collaborator RoleService depends on.
 * Only the methods RoleService actually calls are stubbed.
 */
export const createRoleServiceMocks = () => ({
  roleRepository: {
    findManyRoles: jest.fn(),
    findUniqueRole: jest.fn(),
    createRole: jest.fn(),
    updateRole: jest.fn(),
    deleteRole: jest.fn(),
  },
  rolePermissionCacheService: {
    invalidateRole: jest.fn(),
  },
});

export type RoleServiceMocks = ReturnType<typeof createRoleServiceMocks>;

/** Builds RoleService through the Nest DI container with all deps mocked. */
export const buildRoleService = async (
  mocks: RoleServiceMocks,
): Promise<RoleService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      RoleService,
      { provide: RoleRepository, useValue: mocks.roleRepository },
      {
        provide: RolePermissionCacheService,
        useValue: mocks.rolePermissionCacheService,
      },
    ],
  }).compile();

  return moduleRef.get<RoleService>(RoleService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupRoleService = async () => {
  const mocks = createRoleServiceMocks();
  const service = await buildRoleService(mocks);

  return { mocks, service };
};

export const ADMIN_ROLE_ID = "11111111-1111-4111-8111-111111111111";
export const CLIENT_ROLE_ID = "22222222-2222-4222-8222-222222222222";
export const SELLER_ROLE_ID = "33333333-3333-4333-8333-333333333333";
export const CUSTOM_ROLE_ID = "44444444-4444-4444-8444-444444444444";
export const CREATOR_USER_ID = "55555555-5555-4555-8555-555555555555";
export const PERM_ID_1 = "66666666-6666-4666-8666-666666666666";
export const PERM_ID_2 = "77777777-7777-4777-8777-777777777777";

/** A persisted role row as the repositories return it. */
export const makeRole = (overrides: Record<string, unknown> = {}) => ({
  id: CUSTOM_ROLE_ID,
  name: "Custom Role",
  description: "A custom role for testing",
  isActive: true,
  isSystem: false,
  createdBy: { id: CREATOR_USER_ID, name: "Creator" },
  createdById: CREATOR_USER_ID,
  updatedById: null,
  deletedById: null,
  deletedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
  permissions: [],
  ...overrides,
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

/**
 * Expects a ForbiddenException with the given message.
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
 * Expects a NotFoundException with the given message.
 */
export const expectNotFound = async (
  promise: Promise<unknown>,
  message: string,
) =>
  expect(promise).rejects.toMatchObject({
    status: 404,
    response: { message },
  });
