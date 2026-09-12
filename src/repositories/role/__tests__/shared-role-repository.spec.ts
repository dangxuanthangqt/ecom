import { SharedRoleRepository } from "../shared-role.repository";

import {
  setupSharedRoleRepository,
  ADMIN_ROLE_ID,
  CLIENT_ROLE_ID,
  makeRole,
  containing,
  stringContaining,
  RoleRepositoryMocks,
} from "./role-repository-test-harness";

describe("SharedRoleRepository - getClientRoleId", () => {
  let repository: SharedRoleRepository;
  let mocks: RoleRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedRoleRepository());
  });

  it("fetches client role id from database on first call", async () => {
    // Arrange
    const clientRole = makeRole({ id: CLIENT_ROLE_ID, name: "client" });
    mocks.prismaService.role.findFirstOrThrow.mockResolvedValue(clientRole);

    // Act
    const result = await repository.getClientRoleId();

    // Assert
    expect(mocks.prismaService.role.findFirstOrThrow).toHaveBeenCalledWith({
      where: {
        name: "client",
        deletedAt: null,
      },
    });
    expect(result).toBe(CLIENT_ROLE_ID);
  });

  it("returns cached client role id on subsequent calls without DB hit", async () => {
    // Arrange
    const clientRole = makeRole({ id: CLIENT_ROLE_ID, name: "client" });
    mocks.prismaService.role.findFirstOrThrow.mockResolvedValue(clientRole);

    // Act
    const firstCall = await repository.getClientRoleId();
    const secondCall = await repository.getClientRoleId();

    // Assert
    expect(mocks.prismaService.role.findFirstOrThrow).toHaveBeenCalledTimes(1);
    expect(firstCall).toBe(CLIENT_ROLE_ID);
    expect(secondCall).toBe(CLIENT_ROLE_ID);
  });

  it("throws NotFoundException when client role not found", async () => {
    // Arrange
    mocks.prismaService.role.findFirstOrThrow.mockRejectedValue(
      new Error("Not found"),
    );

    // Act
    const promise = repository.getClientRoleId();

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: stringContaining("client"),
      }),
    });
  });
});

describe("SharedRoleRepository - getAdminRoleId", () => {
  let repository: SharedRoleRepository;
  let mocks: RoleRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedRoleRepository());
  });

  it("fetches admin role id from database on first call", async () => {
    // Arrange
    const adminRole = makeRole({ id: ADMIN_ROLE_ID, name: "admin" });
    mocks.prismaService.role.findFirstOrThrow.mockResolvedValue(adminRole);

    // Act
    const result = await repository.getAdminRoleId();

    // Assert
    expect(mocks.prismaService.role.findFirstOrThrow).toHaveBeenCalledWith({
      where: {
        name: "admin",
        deletedAt: null,
      },
    });
    expect(result).toBe(ADMIN_ROLE_ID);
  });

  it("returns cached admin role id on subsequent calls without DB hit", async () => {
    // Arrange
    const adminRole = makeRole({ id: ADMIN_ROLE_ID, name: "admin" });
    mocks.prismaService.role.findFirstOrThrow.mockResolvedValue(adminRole);

    // Act
    const firstCall = await repository.getAdminRoleId();
    const secondCall = await repository.getAdminRoleId();

    // Assert
    expect(mocks.prismaService.role.findFirstOrThrow).toHaveBeenCalledTimes(1);
    expect(firstCall).toBe(ADMIN_ROLE_ID);
    expect(secondCall).toBe(ADMIN_ROLE_ID);
  });

  it("throws NotFoundException when admin role not found", async () => {
    // Arrange
    mocks.prismaService.role.findFirstOrThrow.mockRejectedValue(
      new Error("Not found"),
    );

    // Act
    const promise = repository.getAdminRoleId();

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: stringContaining("admin"),
      }),
    });
  });
});

describe("SharedRoleRepository - cache independence", () => {
  let repository: SharedRoleRepository;
  let mocks: RoleRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedRoleRepository());
  });

  it("maintains separate caches for admin and client roles", async () => {
    // Arrange
    const adminRole = makeRole({ id: ADMIN_ROLE_ID, name: "admin" });
    const clientRole = makeRole({ id: CLIENT_ROLE_ID, name: "client" });

    mocks.prismaService.role.findFirstOrThrow
      .mockResolvedValueOnce(adminRole)
      .mockResolvedValueOnce(clientRole);

    // Act
    const adminId = await repository.getAdminRoleId();
    const clientId = await repository.getClientRoleId();

    // Fetch again to verify caching
    const adminIdAgain = await repository.getAdminRoleId();
    const clientIdAgain = await repository.getClientRoleId();

    // Assert
    expect(adminId).toBe(ADMIN_ROLE_ID);
    expect(clientId).toBe(CLIENT_ROLE_ID);
    expect(adminIdAgain).toBe(ADMIN_ROLE_ID);
    expect(clientIdAgain).toBe(CLIENT_ROLE_ID);
    expect(mocks.prismaService.role.findFirstOrThrow).toHaveBeenCalledTimes(2);
  });
});
