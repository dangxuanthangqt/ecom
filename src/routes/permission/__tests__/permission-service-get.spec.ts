import { PermissionService } from "../permission.service";

import {
  containing,
  makePermission,
  PERMISSION_ID,
  PermissionServiceMocks,
  setupPermissionService,
} from "./permission-service-test-harness";

describe("PermissionService - getPermissions", () => {
  let service: PermissionService;
  let mocks: PermissionServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupPermissionService());
  });

  it("returns paginated permissions with default pagination parameters", async () => {
    // Arrange
    const permissions = [
      makePermission({ id: "perm-1", key: "user:create:any" }),
      makePermission({ id: "perm-2", key: "user:delete:any" }),
    ];
    mocks.permissionRepository.findManyPermissions.mockResolvedValue({
      permissions,
      permissionsCount: 2,
    });

    // Act
    const result = await service.getPermissions({});

    // Assert
    expect(mocks.permissionRepository.findManyPermissions).toHaveBeenCalledWith(
      containing({
        skip: 0,
        take: 10,
        orderBy: { createdAt: "asc" },
      }),
    );
    expect(result).toEqual({
      data: permissions,
      pagination: {
        page: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 2,
      },
    });
  });

  it("respects custom page and pageSize", async () => {
    // Arrange
    const permissions = [makePermission()];
    mocks.permissionRepository.findManyPermissions.mockResolvedValue({
      permissions,
      permissionsCount: 50,
    });

    // Act
    await service.getPermissions({ page: 2, pageSize: 25 });

    // Assert
    expect(mocks.permissionRepository.findManyPermissions).toHaveBeenCalledWith(
      containing({
        skip: 25,
        take: 25,
      }),
    );
  });

  it("normalizes order to lowercase for Prisma", async () => {
    // Arrange
    mocks.permissionRepository.findManyPermissions.mockResolvedValue({
      permissions: [],
      permissionsCount: 0,
    });

    // Act
    await service.getPermissions({ order: "desc", orderBy: "updatedAt" });

    // Assert
    expect(mocks.permissionRepository.findManyPermissions).toHaveBeenCalledWith(
      containing({
        orderBy: { updatedAt: "desc" },
      }),
    );
  });

  it("calculates correct totalPages", async () => {
    // Arrange
    mocks.permissionRepository.findManyPermissions.mockResolvedValue({
      permissions: Array(10).fill(makePermission()),
      permissionsCount: 45,
    });

    // Act
    const result = await service.getPermissions({ pageSize: 10 });

    // Assert
    expect(result.pagination.totalPages).toBe(5);
  });

  it("returns empty data when no permissions found", async () => {
    // Arrange
    mocks.permissionRepository.findManyPermissions.mockResolvedValue({
      permissions: [],
      permissionsCount: 0,
    });

    // Act
    const result = await service.getPermissions({});

    // Assert
    expect(result.data).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });
});

describe("PermissionService - getPermissionById", () => {
  let service: PermissionService;
  let mocks: PermissionServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupPermissionService());
  });

  it("returns the permission when found", async () => {
    // Arrange
    const permission = makePermission({ id: PERMISSION_ID });
    mocks.permissionRepository.findUniquePermission.mockResolvedValue(
      permission,
    );

    // Act
    const result = await service.getPermissionById(PERMISSION_ID);

    // Assert
    expect(
      mocks.permissionRepository.findUniquePermission,
    ).toHaveBeenCalledWith(PERMISSION_ID);
    expect(result).toBe(permission);
  });

  it("delegates to repository which throws not found", async () => {
    // Arrange
    const notFoundError = new Error("Permission not found");
    mocks.permissionRepository.findUniquePermission.mockRejectedValue(
      notFoundError,
    );

    // Act
    const promise = service.getPermissionById(PERMISSION_ID);

    // Assert
    await expect(promise).rejects.toBe(notFoundError);
  });
});
