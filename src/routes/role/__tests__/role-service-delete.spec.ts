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

  it("allows modification of non-forbidden roles", async () => {
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

  it("throws forbidden when role is admin", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "admin" }),
    );

    // Act
    const promise = service.verifyForbiddenRole(CUSTOM_ROLE_ID);

    // Assert
    await expectForbidden(promise, "You cannot modify this role.");
  });

  it("throws forbidden when role is client", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "client" }),
    );

    // Act
    const promise = service.verifyForbiddenRole(CUSTOM_ROLE_ID);

    // Assert
    await expectForbidden(promise, "You cannot modify this role.");
  });

  it("throws forbidden when role is seller", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "seller" }),
    );

    // Act
    const promise = service.verifyForbiddenRole(CUSTOM_ROLE_ID);

    // Assert
    await expectForbidden(promise, "You cannot modify this role.");
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

  it("refuses to delete an admin role", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "admin" }),
    );

    // Act
    const promise = deleteAs();

    // Assert
    await expectForbidden(promise, "You cannot modify this role.");
    expect(mocks.roleRepository.deleteRole).not.toHaveBeenCalled();
  });

  it("refuses to delete a client role", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "client" }),
    );

    // Act
    const promise = deleteAs();

    // Assert
    await expectForbidden(promise, "You cannot modify this role.");
  });

  it("refuses to delete a seller role", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "seller" }),
    );

    // Act
    const promise = deleteAs();

    // Assert
    await expectForbidden(promise, "You cannot modify this role.");
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
