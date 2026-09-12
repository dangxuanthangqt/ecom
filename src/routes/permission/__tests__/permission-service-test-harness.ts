import { Test } from "@nestjs/testing";

import { PermissionRepository } from "@/repositories/permission/permission.repository";

import { PermissionService } from "../permission.service";

/**
 * Test doubles for every collaborator PermissionService depends on.
 * Only the methods PermissionService actually calls are stubbed.
 */
export const createPermissionServiceMocks = () => ({
  permissionRepository: {
    findManyPermissions: jest.fn(),
    findUniquePermission: jest.fn(),
    createPermission: jest.fn(),
    updatePermission: jest.fn(),
    deletePermission: jest.fn(),
  },
});

export type PermissionServiceMocks = ReturnType<
  typeof createPermissionServiceMocks
>;

/** Builds PermissionService through the Nest DI container with all deps mocked. */
export const buildPermissionService = async (
  mocks: PermissionServiceMocks,
): Promise<PermissionService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      PermissionService,
      { provide: PermissionRepository, useValue: mocks.permissionRepository },
    ],
  }).compile();

  return moduleRef.get<PermissionService>(PermissionService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupPermissionService = async () => {
  const mocks = createPermissionServiceMocks();
  const service = await buildPermissionService(mocks);

  return { mocks, service };
};

export const PERMISSION_ID = "11111111-1111-4111-8111-111111111111";
export const ROLE_ID_1 = "22222222-2222-4222-8222-222222222222";
export const ROLE_ID_2 = "33333333-3333-4333-8333-333333333333";
export const CREATOR_USER_ID = "44444444-4444-4444-8444-444444444444";

/** A persisted permission row as the repositories return it. */
export const makePermission = (overrides: Record<string, unknown> = {}) => ({
  id: PERMISSION_ID,
  name: "Create User",
  description: "Allows creating new users",
  path: "/users",
  method: "POST",
  module: "USERS",
  createdBy: { id: CREATOR_USER_ID, name: "Creator" },
  createdById: CREATOR_USER_ID,
  updatedById: null,
  deletedById: null,
  deletedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
  roles: [],
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
