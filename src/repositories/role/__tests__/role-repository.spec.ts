import { BadRequestException } from "@nestjs/common";

import { RoleRepository } from "../role.repository";

import {
  setupRoleRepository,
  ADMIN_ROLE_ID,
  CLIENT_ROLE_ID,
  PERMISSION_ID,
  makeRole,
  containing,
  anyObject,
  anyDate,
  arrayContaining,
  RoleRepositoryMocks,
  createPrismaUniqueError,
  createPrismaNotFoundError,
  createPrismaForeignKeyError,
} from "./role-repository-test-harness";

describe("RoleRepository - findManyRoles", () => {
  let repository: RoleRepository;
  let mocks: RoleRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupRoleRepository());
  });

  it("fetches multiple active roles with pagination", async () => {
    // Arrange
    const roles = [
      makeRole({ id: ADMIN_ROLE_ID, name: "admin" }),
      makeRole({ id: CLIENT_ROLE_ID, name: "client" }),
    ];
    mocks.prismaService.role.findMany.mockResolvedValue(roles);
    mocks.prismaService.role.count.mockResolvedValue(2);

    // Act
    const result = await repository.findManyRoles({
      take: 10,
      skip: 0,
    });

    // Assert
    expect(mocks.prismaService.role.findMany).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
        take: 10,
        skip: 0,
      }),
    );
    expect(mocks.prismaService.role.count).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
      }),
    );
    expect(result).toEqual({ roles, rolesCount: 2 });
  });

  it("excludes deleted roles from results", async () => {
    // Arrange
    mocks.prismaService.role.findMany.mockResolvedValue([]);
    mocks.prismaService.role.count.mockResolvedValue(0);

    // Act
    await repository.findManyRoles({});

    // Assert
    expect(mocks.prismaService.role.findMany).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
      }),
    );
  });

  it("applies orderBy clause", async () => {
    // Arrange
    mocks.prismaService.role.findMany.mockResolvedValue([]);
    mocks.prismaService.role.count.mockResolvedValue(0);

    // Act
    await repository.findManyRoles({
      orderBy: { name: "asc" },
    });

    // Assert
    expect(mocks.prismaService.role.findMany).toHaveBeenCalledWith(
      containing({
        orderBy: { name: "asc" },
      }),
    );
  });
});

describe("RoleRepository - findUniqueRole", () => {
  let repository: RoleRepository;
  let mocks: RoleRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupRoleRepository());
  });

  it("fetches a unique role by id", async () => {
    // Arrange
    const role = makeRole({ id: ADMIN_ROLE_ID });
    mocks.prismaService.role.findUniqueOrThrow.mockResolvedValue(role);

    // Act
    const result = await repository.findUniqueRole(ADMIN_ROLE_ID);

    // Assert
    expect(mocks.prismaService.role.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: ADMIN_ROLE_ID, deletedAt: null },
      select: anyObject(),
    });
    expect(result).toEqual(role);
  });

  it("throws NotFoundException when role not found", async () => {
    // Arrange
    mocks.prismaService.role.findUniqueOrThrow.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.findUniqueRole("nonexistent-id");

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Role not found.",
      }),
    });
  });
});

describe("RoleRepository - createRole", () => {
  let repository: RoleRepository;
  let mocks: RoleRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupRoleRepository());
  });

  it("creates a role without permissions", async () => {
    // Arrange
    const role = makeRole({ name: "new_role" });
    mocks.prismaService.role.create.mockResolvedValue(role);

    // Act
    const result = await repository.createRole({
      data: { name: "new_role", description: "A new role" },
    });

    // Assert
    expect(mocks.prismaService.role.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          name: "new_role",
          description: "A new role",
          permissions: {
            connect: undefined,
          },
        }),
      }),
    );
    expect(result).toEqual(role);
  });

  it("creates a role with permissions after validation", async () => {
    // Arrange
    const role = makeRole({
      permissions: [{ id: PERMISSION_ID, name: "read" }],
    });
    mocks.prismaService.permission.findMany.mockResolvedValue([
      { id: PERMISSION_ID, name: "read", deletedAt: null },
    ]);
    mocks.prismaService.role.create.mockResolvedValue(role);

    // Act
    const result = await repository.createRole({
      data: { name: "new_role" },
      permissionIds: [PERMISSION_ID],
    });

    // Assert
    expect(mocks.prismaService.permission.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [PERMISSION_ID] },
        deletedAt: null,
      },
    });
    expect(result).toEqual(role);
  });

  it("throws BadRequestException when permission validation fails", async () => {
    // Arrange
    mocks.prismaService.permission.findMany.mockResolvedValue([]);

    // Act
    const promise = repository.createRole({
      data: { name: "new_role" },
      permissionIds: ["invalid-permission-id"],
    });

    // Assert
    await expect(promise).rejects.toThrow(BadRequestException);
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: arrayContaining([
          containing({
            message: "Invalid permissions provided.",
          }),
        ]),
      }),
    });
  });

  it("throws UnprocessableEntityException on unique constraint", async () => {
    // Arrange
    mocks.prismaService.role.create.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.createRole({
      data: { name: "existing_role" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });

  it("throws UnprocessableEntityException on foreign key constraint", async () => {
    // Arrange
    mocks.prismaService.role.create.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.createRole({
      data: { name: "new_role" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("RoleRepository - updateRole", () => {
  let repository: RoleRepository;
  let mocks: RoleRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupRoleRepository());
  });

  it("updates a role without permissions", async () => {
    // Arrange
    const updated = makeRole({ name: "updated_role" });
    mocks.prismaService.role.update.mockResolvedValue(updated);

    // Act
    const result = await repository.updateRole({
      id: ADMIN_ROLE_ID,
      data: { name: "updated_role" },
    });

    // Assert
    expect(mocks.prismaService.role.update).toHaveBeenCalledWith(
      containing({
        where: { id: ADMIN_ROLE_ID, deletedAt: null },
      }),
    );
    expect(result).toEqual(updated);
  });

  it("updates role permissions after validation", async () => {
    // Arrange
    mocks.prismaService.permission.findMany.mockResolvedValue([
      { id: PERMISSION_ID, name: "read" },
    ]);
    const updated = makeRole({ permissions: [{ id: PERMISSION_ID }] });
    mocks.prismaService.role.update.mockResolvedValue(updated);

    // Act
    await repository.updateRole({
      id: ADMIN_ROLE_ID,
      data: { name: "updated" },
      permissionIds: [PERMISSION_ID],
    });

    // Assert
    expect(mocks.prismaService.permission.findMany).toHaveBeenCalled();
    expect(mocks.prismaService.role.update).toHaveBeenCalled();
  });

  it("throws NotFoundException when role not found", async () => {
    // Arrange
    mocks.prismaService.role.update.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.updateRole({
      id: "nonexistent-id",
      data: { name: "updated" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Role not found.",
      }),
    });
  });

  it("throws BadRequestException on invalid permissions", async () => {
    // Arrange
    mocks.prismaService.permission.findMany.mockResolvedValue([]);

    // Act
    const promise = repository.updateRole({
      id: ADMIN_ROLE_ID,
      data: { name: "updated" },
      permissionIds: ["invalid-id"],
    });

    // Assert
    await expect(promise).rejects.toThrow(BadRequestException);
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: arrayContaining([
          containing({
            message: "Invalid permissions provided.",
          }),
        ]),
      }),
    });
  });
});

describe("RoleRepository - deleteRole", () => {
  let repository: RoleRepository;
  let mocks: RoleRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupRoleRepository());
  });

  it("soft deletes a role by default", async () => {
    // Arrange
    const deletedRole = makeRole({ deletedAt: new Date() });
    mocks.prismaService.role.update.mockResolvedValue(deletedRole);

    // Act
    const result = await repository.deleteRole({
      id: ADMIN_ROLE_ID,
      userId: "user-123",
    });

    // Assert
    expect(mocks.prismaService.role.update).toHaveBeenCalledWith(
      containing({
        where: { id: ADMIN_ROLE_ID, deletedAt: null },
        data: containing({
          deletedAt: anyDate(),
          deletedById: "user-123",
        }),
      }),
    );
    expect(result).toEqual(deletedRole);
  });

  it("hard deletes a role when isHardDelete is true", async () => {
    // Arrange
    const deletedRole = makeRole();
    mocks.prismaService.role.delete.mockResolvedValue(deletedRole);

    // Act
    await repository.deleteRole({
      id: ADMIN_ROLE_ID,
      userId: "user-123",
      isHardDelete: true,
    });

    // Assert
    expect(mocks.prismaService.role.delete).toHaveBeenCalledWith(
      containing({
        where: { id: ADMIN_ROLE_ID },
      }),
    );
  });

  it("throws NotFoundException when role not found", async () => {
    // Arrange
    mocks.prismaService.role.update.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.deleteRole({
      id: "nonexistent-id",
      userId: "user-123",
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Role not found.",
      }),
    });
  });
});
