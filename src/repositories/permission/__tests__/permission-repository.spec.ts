import { BadRequestException } from "@nestjs/common";

import { PermissionRepository } from "../permission.repository";

import {
  setupPermissionRepository,
  PERMISSION_ID,
  ROLE_ID,
  makePermission,
  containing,
  stringContaining,
  anyDate,
  arrayContaining,
  PermissionRepositoryMocks,
  createPrismaUniqueError,
  createPrismaNotFoundError,
  createPrismaForeignKeyError,
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
      orderBy: { name: "asc" },
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

describe("PermissionRepository - createPermission", () => {
  let repository: PermissionRepository;
  let mocks: PermissionRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupPermissionRepository());
  });

  it("creates a permission without roles", async () => {
    // Arrange
    const permission = makePermission();
    mocks.prismaService.permission.create.mockResolvedValue(permission);

    // Act
    const result = await repository.createPermission({
      data: {
        name: "read",
        path: "/api/users",
        method: "GET",
        module: "users",
      },
    });

    // Assert
    expect(mocks.prismaService.permission.create).toHaveBeenCalled();
    expect(result).toEqual(permission);
  });

  it("creates a permission with roles after validation", async () => {
    // Arrange
    const permission = makePermission({
      roles: [{ id: ROLE_ID, name: "admin" }],
    });
    mocks.prismaService.role.findMany.mockResolvedValue([
      { id: ROLE_ID, deletedAt: null },
    ]);
    mocks.prismaService.permission.create.mockResolvedValue(permission);

    // Act
    const result = await repository.createPermission({
      data: { name: "read", path: "/api", method: "GET", module: "api" },
      rolesIds: [ROLE_ID],
    });

    // Assert
    expect(mocks.prismaService.role.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [ROLE_ID] },
        deletedAt: null,
      },
    });
    expect(result).toEqual(permission);
  });

  it("throws BadRequestException when role validation fails", async () => {
    // Arrange
    mocks.prismaService.role.findMany.mockResolvedValue([]);

    // Act
    const promise = repository.createPermission({
      data: { name: "read", path: "/api", method: "GET", module: "api" },
      rolesIds: ["invalid-role-id"],
    });

    // Assert
    await expect(promise).rejects.toThrow(BadRequestException);
    await expect(promise).rejects.toMatchObject({
      response: containing({
        details: arrayContaining([
          containing({
            message: "Invalid roles provided.",
          }),
        ]),
      }),
    });
  });

  it("throws UnprocessableEntityException on unique constraint", async () => {
    // Arrange
    mocks.prismaService.permission.create.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.createPermission({
      data: { name: "read", path: "/api", method: "GET", module: "api" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });

  it("throws UnprocessableEntityException on foreign key constraint", async () => {
    // Arrange
    mocks.prismaService.permission.create.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.createPermission({
      data: { name: "read", path: "/api", method: "GET", module: "api" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("PermissionRepository - updatePermission", () => {
  let repository: PermissionRepository;
  let mocks: PermissionRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupPermissionRepository());
  });

  it("updates a permission without roles", async () => {
    // Arrange
    const updated = makePermission({ name: "write" });
    mocks.prismaService.permission.update.mockResolvedValue(updated);

    // Act
    const result = await repository.updatePermission({
      id: PERMISSION_ID,
      data: { name: "write" },
    });

    // Assert
    expect(mocks.prismaService.permission.update).toHaveBeenCalledWith(
      containing({
        where: { id: PERMISSION_ID, deletedAt: null },
      }),
    );
    expect(result).toEqual(updated);
  });

  it("updates permission roles after validation", async () => {
    // Arrange
    mocks.prismaService.role.findMany.mockResolvedValue([
      { id: ROLE_ID, deletedAt: null },
    ]);
    const updated = makePermission({ roles: [{ id: ROLE_ID }] });
    mocks.prismaService.permission.update.mockResolvedValue(updated);

    // Act
    await repository.updatePermission({
      id: PERMISSION_ID,
      data: { name: "write" },
      rolesIds: [ROLE_ID],
    });

    // Assert
    expect(mocks.prismaService.role.findMany).toHaveBeenCalled();
    expect(mocks.prismaService.permission.update).toHaveBeenCalled();
  });

  it("throws NotFoundException when permission not found", async () => {
    // Arrange
    mocks.prismaService.permission.update.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.updatePermission({
      id: "nonexistent-id",
      data: { name: "updated" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: stringContaining("Permission"),
      }),
    });
  });

  it("throws BadRequestException on invalid roles", async () => {
    // Arrange
    mocks.prismaService.role.findMany.mockResolvedValue([]);

    // Act
    const promise = repository.updatePermission({
      id: PERMISSION_ID,
      data: { name: "updated" },
      rolesIds: ["invalid-id"],
    });

    // Assert
    await expect(promise).rejects.toThrow(BadRequestException);
    await expect(promise).rejects.toMatchObject({
      response: containing({
        details: arrayContaining([
          containing({
            message: "Invalid roles provided.",
          }),
        ]),
      }),
    });
  });
});

describe("PermissionRepository - deletePermission", () => {
  let repository: PermissionRepository;
  let mocks: PermissionRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupPermissionRepository());
  });

  it("soft deletes a permission by default", async () => {
    // Arrange
    const deletedPermission = makePermission({ deletedAt: new Date() });
    mocks.prismaService.permission.update.mockResolvedValue(deletedPermission);

    // Act
    const result = await repository.deletePermission({
      id: PERMISSION_ID,
      userId: "user-123",
    });

    // Assert
    expect(mocks.prismaService.permission.update).toHaveBeenCalledWith(
      containing({
        where: { id: PERMISSION_ID, deletedAt: null },
        data: containing({
          deletedAt: anyDate(),
          deletedById: "user-123",
        }),
      }),
    );
    expect(result).toEqual(deletedPermission);
  });

  it("hard deletes a permission when isHardDelete is true", async () => {
    // Arrange
    const deletedPermission = makePermission();
    mocks.prismaService.permission.delete.mockResolvedValue(deletedPermission);

    // Act
    await repository.deletePermission({
      id: PERMISSION_ID,
      userId: "user-123",
      isHardDelete: true,
    });

    // Assert
    expect(mocks.prismaService.permission.delete).toHaveBeenCalledWith(
      containing({
        where: { id: PERMISSION_ID, deletedAt: null },
      }),
    );
  });

  it("throws NotFoundException when permission not found during soft delete", async () => {
    // Arrange
    mocks.prismaService.permission.update.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.deletePermission({
      id: "nonexistent-id",
      userId: "user-123",
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: stringContaining("Permission"),
      }),
    });
  });
});
