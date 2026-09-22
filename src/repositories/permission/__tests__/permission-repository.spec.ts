import { PermissionRepository } from "../permission.repository";

import {
  setupPermissionRepository,
  PERMISSION_ID,
  makePermission,
  containing,
  PermissionRepositoryMocks,
  createPrismaNotFoundError,
} from "./permission-repository-test-harness";

describe("PermissionRepository - findManyPermissions", () => {
  let repository: PermissionRepository;
  let mocks: PermissionRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupPermissionRepository());
  });

  it("fetches multiple active permissions with transaction", async () => {
    // Arrange
    const permissions = [
      makePermission({ id: PERMISSION_ID, name: "read" }),
      makePermission({
        id: "22222222-2222-4222-8222-222222222222",
        name: "write",
      }),
    ];
    mocks.prismaService.$transaction.mockResolvedValue([2, permissions]);

    // Act
    const result = await repository.findManyPermissions({
      take: 10,
      skip: 0,
    });

    // Assert
    expect(mocks.prismaService.$transaction).toHaveBeenCalled();
    expect(result).toEqual({
      permissions,
      permissionsCount: 2,
    });
  });

  it("excludes deleted permissions", async () => {
    // Arrange
    mocks.prismaService.$transaction.mockResolvedValue([0, []]);

    // Act
    await repository.findManyPermissions({});

    // Assert
    expect(mocks.prismaService.$transaction).toHaveBeenCalled();
  });

  it("applies orderBy clause", async () => {
    // Arrange
    mocks.prismaService.$transaction.mockResolvedValue([0, []]);

    // Act
    await repository.findManyPermissions({
      orderBy: { key: "asc" },
    });

    // Assert
    expect(mocks.prismaService.$transaction).toHaveBeenCalled();
  });
});

describe("PermissionRepository - findUniquePermission", () => {
  let repository: PermissionRepository;
  let mocks: PermissionRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupPermissionRepository());
  });

  it("fetches a unique permission by id", async () => {
    // Arrange
    const permission = makePermission({ id: PERMISSION_ID });
    mocks.prismaService.permission.findUniqueOrThrow.mockResolvedValue(
      permission,
    );

    // Act
    const result = await repository.findUniquePermission(PERMISSION_ID);

    // Assert
    expect(
      mocks.prismaService.permission.findUniqueOrThrow,
    ).toHaveBeenCalledWith(
      containing({
        where: { id: PERMISSION_ID, deletedAt: null },
      }),
    );
    expect(result).toEqual(permission);
  });

  it("throws NotFoundException when permission not found", async () => {
    // Arrange
    mocks.prismaService.permission.findUniqueOrThrow.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.findUniquePermission("nonexistent-id");

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Permission not found.",
      }),
    });
  });
});
