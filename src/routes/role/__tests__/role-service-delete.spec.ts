import { DeleteRoleRequestDto } from "@/dtos/role/role.dto";

import { RoleService } from "../role.service";

import {
  CREATOR_USER_ID,
  CUSTOM_ROLE_ID,
  expectForbidden,
  makeRole,
  RoleServiceMocks,
  setupRoleService,
} from "./role-service-test-harness";

describe("RoleService - verifyForbiddenRole", () => {
  let service: RoleService;
  let mocks: RoleServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupRoleService());
  });

  it("allows modification of roles that are not system roles", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "Custom Role" }),
    );

    // Act & Assert
    await expect(
      service.verifyForbiddenRole(CUSTOM_ROLE_ID),
    ).resolves.toBeUndefined();
    expect(mocks.roleRepository.findUniqueRole).toHaveBeenCalledWith(
      CUSTOM_ROLE_ID,
    );
  });

  it("throws forbidden when the role is a system role (admin)", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "admin", isSystem: true }),
    );

    // Act
    const promise = service.verifyForbiddenRole(CUSTOM_ROLE_ID);

    // Assert
    await expectForbidden(
      promise,
      "System roles cannot be modified through the API.",
    );
  });

  it("throws forbidden when the role is a system role (client)", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "client", isSystem: true }),
    );

    // Act
    const promise = service.verifyForbiddenRole(CUSTOM_ROLE_ID);

    // Assert
    await expectForbidden(
      promise,
      "System roles cannot be modified through the API.",
    );
  });

  it("throws forbidden when the role is a system role (seller)", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "seller", isSystem: true }),
    );

    // Act
    const promise = service.verifyForbiddenRole(CUSTOM_ROLE_ID);

    // Assert
    await expectForbidden(
      promise,
      "System roles cannot be modified through the API.",
    );
  });

  it("throws not found when role does not exist", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockRejectedValue(
      new Error("Role not found"),
    );

    // Act
    const promise = service.verifyForbiddenRole(CUSTOM_ROLE_ID);

    // Assert
    await expect(promise).rejects.toThrow("Role not found");
  });
});

describe("RoleService - deleteRole", () => {
  let service: RoleService;
  let mocks: RoleServiceMocks;

  const makeBody = (overrides: Partial<DeleteRoleRequestDto> = {}) =>
    ({
      isHardDelete: false,
      ...overrides,
    }) as DeleteRoleRequestDto;

  const deleteAs = (
    id = CUSTOM_ROLE_ID,
    body = makeBody(),
    userId = CREATOR_USER_ID,
  ) => service.deleteRole({ id, body, userId });

  beforeEach(async () => {
    ({ service, mocks } = await setupRoleService());
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "Custom Role" }),
    );
    mocks.roleRepository.deleteRole.mockResolvedValue(
      makeRole({ deletedAt: new Date() }),
    );
  });

  it("soft deletes a role by default", async () => {
    // Arrange
    const body = makeBody({ isHardDelete: false });

    // Act
    await deleteAs(CUSTOM_ROLE_ID, body);

    // Assert
    expect(mocks.roleRepository.deleteRole).toHaveBeenCalledWith({
      id: CUSTOM_ROLE_ID,
      userId: CREATOR_USER_ID,
      isHardDelete: false,
    });
  });

  it("hard deletes a role when requested", async () => {
    // Arrange
    const body = makeBody({ isHardDelete: true });

    // Act
    await deleteAs(CUSTOM_ROLE_ID, body);

    // Assert
    expect(mocks.roleRepository.deleteRole).toHaveBeenCalledWith({
      id: CUSTOM_ROLE_ID,
      userId: CREATOR_USER_ID,
      isHardDelete: true,
    });
  });

  it("returns the deleted role from the repository", async () => {
    // Arrange
    const deleted = makeRole({ id: CUSTOM_ROLE_ID, deletedAt: new Date() });
    mocks.roleRepository.deleteRole.mockResolvedValue(deleted);

    // Act
    const result = await deleteAs();

    // Assert
    expect(result).toBe(deleted);
  });

  it("invalidates the role's cached permission checks after deleting", async () => {
    // Act
    await deleteAs(CUSTOM_ROLE_ID);

    // Assert
    expect(
      mocks.rolePermissionCacheService.invalidateRole,
    ).toHaveBeenCalledWith(CUSTOM_ROLE_ID);
  });

  it("does not invalidate the cache when the delete is refused", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "admin", isSystem: true }),
    );

    // Act
    await deleteAs().catch(() => undefined);

    // Assert
    expect(
      mocks.rolePermissionCacheService.invalidateRole,
    ).not.toHaveBeenCalled();
  });

  it("refuses to delete an admin role", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "admin", isSystem: true }),
    );

    // Act
    const promise = deleteAs();

    // Assert
    await expectForbidden(
      promise,
      "System roles cannot be modified through the API.",
    );
    expect(mocks.roleRepository.deleteRole).not.toHaveBeenCalled();
  });

  it("refuses to delete a client role", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "client", isSystem: true }),
    );

    // Act
    const promise = deleteAs();

    // Assert
    await expectForbidden(
      promise,
      "System roles cannot be modified through the API.",
    );
  });

  it("refuses to delete a seller role", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "seller", isSystem: true }),
    );

    // Act
    const promise = deleteAs();

    // Assert
    await expectForbidden(
      promise,
      "System roles cannot be modified through the API.",
    );
  });

  it("throws not found when role does not exist", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockRejectedValue(
      new Error("Role not found"),
    );

    // Act
    const promise = deleteAs();

    // Assert
    await expect(promise).rejects.toThrow("Role not found");
    expect(mocks.roleRepository.deleteRole).not.toHaveBeenCalled();
  });
});
