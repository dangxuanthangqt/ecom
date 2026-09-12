import { UnprocessableEntityException } from "@nestjs/common";

import { RoleWithPermissionsResponseDto } from "@/dtos/role/role.dto";

import { RoleController } from "../role.controller";

import {
  ACTIVE_USER_ID,
  RoleControllerMocks,
  makeRoleWithPermissions,
  setupRoleController,
  ROLE_ID,
} from "./role-controller-test-harness";

describe("RoleController - createRole", () => {
  let controller: RoleController;
  let mocks: RoleControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupRoleController());
  });

  it("calls roleService.createRole with body and userId", async () => {
    // Arrange
    const body = {
      name: "NEW_ROLE",
      description: "New role",
      permissionIds: ["perm-1", "perm-2"],
    };
    mocks.roleService.createRole.mockResolvedValue(makeRoleWithPermissions());

    // Act
    await controller.createRole(body, ACTIVE_USER_ID);

    // Assert
    expect(mocks.roleService.createRole).toHaveBeenCalledWith({
      body,
      userId: ACTIVE_USER_ID,
    });
  });

  it("returns the created role wrapped in RoleWithPermissionsResponseDto", async () => {
    // Arrange
    const created = makeRoleWithPermissions({ name: "NEW_ROLE" });
    mocks.roleService.createRole.mockResolvedValue(created);

    // Act
    const result = await controller.createRole(
      {
        name: "NEW_ROLE",
        description: "New role",
        permissionIds: ["perm-1"],
      },
      ACTIVE_USER_ID,
    );

    // Assert
    expect(result).toBeInstanceOf(RoleWithPermissionsResponseDto);
  });

  it("propagates rejection from roleService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Role already exists");
    mocks.roleService.createRole.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.createRole(
        { name: "ADMIN", description: "Admin", permissionIds: [] },
        ACTIVE_USER_ID,
      ),
    ).rejects.toBe(error);
  });
});

describe("RoleController - updateRole", () => {
  let controller: RoleController;
  let mocks: RoleControllerMocks;

  const makeUpdateRoleBody = () => ({
    name: "UPDATED_ROLE",
    description: "Updated description",
    permissionIds: ["perm-2"],
  });

  beforeEach(async () => {
    ({ controller, mocks } = await setupRoleController());
  });

  it("calls roleService.updateRole with id, body, and userId", async () => {
    // Arrange
    const body = makeUpdateRoleBody();
    mocks.roleService.updateRole.mockResolvedValue(makeRoleWithPermissions());

    // Act
    await controller.updateRole(ROLE_ID, body, ACTIVE_USER_ID);

    // Assert
    expect(mocks.roleService.updateRole).toHaveBeenCalledWith({
      id: ROLE_ID,
      body,
      userId: ACTIVE_USER_ID,
    });
  });

  it("returns the updated role wrapped in RoleWithPermissionsResponseDto", async () => {
    // Arrange
    const updated = makeRoleWithPermissions({
      description: "Updated description",
    });
    mocks.roleService.updateRole.mockResolvedValue(updated);

    // Act
    const result = await controller.updateRole(
      ROLE_ID,
      makeUpdateRoleBody(),
      ACTIVE_USER_ID,
    );

    // Assert
    expect(result).toBeInstanceOf(RoleWithPermissionsResponseDto);
  });

  it("propagates rejection from roleService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Role not found");
    mocks.roleService.updateRole.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.updateRole(ROLE_ID, makeUpdateRoleBody(), ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});

describe("RoleController - deleteRole", () => {
  let controller: RoleController;
  let mocks: RoleControllerMocks;

  const makeDeleteBody = () => ({ isHardDelete: false });

  beforeEach(async () => {
    ({ controller, mocks } = await setupRoleController());
  });

  it("calls roleService.deleteRole with id, userId, and body", async () => {
    // Arrange
    const body = makeDeleteBody();
    mocks.roleService.deleteRole.mockResolvedValue(makeRoleWithPermissions());

    // Act
    await controller.deleteRole(ROLE_ID, ACTIVE_USER_ID, body);

    // Assert
    expect(mocks.roleService.deleteRole).toHaveBeenCalledWith({
      id: ROLE_ID,
      userId: ACTIVE_USER_ID,
      body,
    });
  });

  it("returns the deleted role wrapped in RoleWithPermissionsResponseDto", async () => {
    // Arrange
    const deleted = makeRoleWithPermissions();
    mocks.roleService.deleteRole.mockResolvedValue(deleted);

    // Act
    const result = await controller.deleteRole(
      ROLE_ID,
      ACTIVE_USER_ID,
      makeDeleteBody(),
    );

    // Assert
    expect(result).toBeInstanceOf(RoleWithPermissionsResponseDto);
  });

  it("propagates rejection from roleService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Cannot delete system role");
    mocks.roleService.deleteRole.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.deleteRole(ROLE_ID, ACTIVE_USER_ID, makeDeleteBody()),
    ).rejects.toBe(error);
  });
});
