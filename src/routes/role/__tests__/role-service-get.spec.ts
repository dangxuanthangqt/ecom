import { RoleService } from "../role.service";

import {
  CUSTOM_ROLE_ID,
  containing,
  makeRole,
  RoleServiceMocks,
  setupRoleService,
} from "./role-service-test-harness";

describe("RoleService - getRoles", () => {
  let service: RoleService;
  let mocks: RoleServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupRoleService());
  });

  it("returns paginated roles with default pagination parameters", async () => {
    // Arrange
    const roles = [
      makeRole({ id: "role-1", name: "Admin" }),
      makeRole({ id: "role-2", name: "User" }),
    ];
    mocks.roleRepository.findManyRoles.mockResolvedValue({
      roles,
      rolesCount: 2,
    });

    // Act
    const result = await service.getRoles({});

    // Assert
    expect(mocks.roleRepository.findManyRoles).toHaveBeenCalledWith(
      containing({
        skip: 0,
        take: 10,
        orderBy: { createdAt: "asc" },
      }),
    );
    expect(result).toEqual({
      data: roles,
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
    const roles = [makeRole()];
    mocks.roleRepository.findManyRoles.mockResolvedValue({
      roles,
      rolesCount: 25,
    });

    // Act
    await service.getRoles({ page: 3, pageSize: 20 });

    // Assert
    expect(mocks.roleRepository.findManyRoles).toHaveBeenCalledWith(
      containing({
        skip: 40,
        take: 20,
      }),
    );
  });

  it("normalizes order to lowercase for Prisma", async () => {
    // Arrange
    mocks.roleRepository.findManyRoles.mockResolvedValue({
      roles: [],
      rolesCount: 0,
    });

    // Act
    await service.getRoles({ order: "desc", orderBy: "updatedAt" });

    // Assert
    expect(mocks.roleRepository.findManyRoles).toHaveBeenCalledWith(
      containing({
        orderBy: { updatedAt: "desc" },
      }),
    );
  });

  it("calculates correct totalPages", async () => {
    // Arrange
    mocks.roleRepository.findManyRoles.mockResolvedValue({
      roles: Array(10).fill(makeRole()),
      rolesCount: 35,
    });

    // Act
    const result = await service.getRoles({ pageSize: 10 });

    // Assert
    expect(result.pagination.totalPages).toBe(4);
  });

  it("returns empty data when no roles found", async () => {
    // Arrange
    mocks.roleRepository.findManyRoles.mockResolvedValue({
      roles: [],
      rolesCount: 0,
    });

    // Act
    const result = await service.getRoles({});

    // Assert
    expect(result.data).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });
});

describe("RoleService - getRoleById", () => {
  let service: RoleService;
  let mocks: RoleServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupRoleService());
  });

  it("returns the role when found", async () => {
    // Arrange
    const role = makeRole({ id: CUSTOM_ROLE_ID });
    mocks.roleRepository.findUniqueRole.mockResolvedValue(role);

    // Act
    const result = await service.getRoleById(CUSTOM_ROLE_ID);

    // Assert
    expect(mocks.roleRepository.findUniqueRole).toHaveBeenCalledWith(
      CUSTOM_ROLE_ID,
    );
    expect(result).toBe(role);
  });

  it("delegates to repository which throws not found", async () => {
    // Arrange
    const notFoundError = new Error("Role not found");
    mocks.roleRepository.findUniqueRole.mockRejectedValue(notFoundError);

    // Act
    const promise = service.getRoleById(CUSTOM_ROLE_ID);

    // Assert
    await expect(promise).rejects.toBe(notFoundError);
  });
});
