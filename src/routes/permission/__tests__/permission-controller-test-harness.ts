import { Test } from "@nestjs/testing";

import { PermissionController } from "../permission.controller";
import { PermissionService } from "../permission.service";

/**
 * Test doubles for every collaborator PermissionController depends on. The
 * controller is read-only, so only the two read methods are stubbed.
 */
export const createPermissionControllerMocks = () => ({
  permissionService: {
    getPermissions: jest.fn(),
    getPermissionById: jest.fn(),
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

export const PERMISSION_ID = "11111111-1111-4111-8111-111111111111";
export const ROLE_ID = "22222222-2222-4222-8222-222222222222";

/** A catalogue row with its roles, as the service returns it. */
export const makePermissionWithRoles = (
  overrides: Record<string, unknown> = {},
) => ({
  id: PERMISSION_ID,
  key: "product:update:own",
  resource: "product",
  action: "update",
  scope: "own",
  description: "Update products the caller created",
  roles: [
    {
      id: ROLE_ID,
      name: "seller",
      description: "Seller role",
      isActive: true,
      isSystem: true,
    },
  ],
  ...overrides,
});

export const makePaginatedPermissions = (
  items = [makePermissionWithRoles()],
) => ({
  data: items,
  pagination: {
    pageIndex: 1,
    pageSize: 10,
    totalPages: 1,
    totalItems: items.length,
  },
});
