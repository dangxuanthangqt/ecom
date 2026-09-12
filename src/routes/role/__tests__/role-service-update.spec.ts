import { UpdateRoleRequestDto } from "@/dtos/role/role.dto";

import { RoleService } from "../role.service";

import {
  CREATOR_USER_ID,
  CUSTOM_ROLE_ID,
  containing,
  expectForbidden,
  makeRole,
  PERM_ID_1,
  PERM_ID_2,
  RoleServiceMocks,
  setupRoleService,
} from "./role-service-test-harness";

describe("RoleService - updateRole", () => {
  let service: RoleService;
  let mocks: RoleServiceMocks;

  const makeBody = (overrides: Partial<UpdateRoleRequestDto> = {}) =>
    ({
      name: "Updated Role",
      description: "Updated description",
      permissionIds: [],
      ...overrides,
    }) as UpdateRoleRequestDto;

  const updateAs = (id = CUSTOM_ROLE_ID, body = makeBody()) =>
    service.updateRole({ id, body, userId: CREATOR_USER_ID });

  beforeEach(async () => {
    ({ service, mocks } = await setupRoleService());
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "Custom Role" }),
    );
    mocks.roleRepository.updateRole.mockResolvedValue(makeRole());
  });

  it("updates the role with new name and description", async () => {
    // Arrange
    const body = makeBody({
      name: "Senior Manager",
      description: "Senior management role",
    });

    // Act
    await updateAs(CUSTOM_ROLE_ID, body);

    // Assert
    expect(mocks.roleRepository.updateRole).toHaveBeenCalledWith(
      containing({
        id: CUSTOM_ROLE_ID,
        data: containing({
          name: "Senior Manager",
          description: "Senior management role",
          updatedById: CREATOR_USER_ID,
        }),
      }),
    );
  });

  it("passes permissionIds to the repository", async () => {
    // Arrange
    const body = makeBody({ permissionIds: [PERM_ID_1, PERM_ID_2] });

    // Act
    await updateAs(CUSTOM_ROLE_ID, body);

    // Assert
    expect(mocks.roleRepository.updateRole).toHaveBeenCalledWith(
      containing({
        permissionIds: [PERM_ID_1, PERM_ID_2],
      }),
    );
  });

  it("stamps the updater userId on the updated role", async () => {
    // Arrange
    const body = makeBody();

    // Act
    await updateAs(CUSTOM_ROLE_ID, body);

    // Assert
    expect(mocks.roleRepository.updateRole).toHaveBeenCalledWith(
      containing({
        data: containing({
          updatedById: CREATOR_USER_ID,
        }),
      }),
    );
  });

  it("returns the updated role from the repository", async () => {
    // Arrange
    const updated = makeRole({ id: CUSTOM_ROLE_ID, name: "Updated" });
    mocks.roleRepository.updateRole.mockResolvedValue(updated);

    // Act
    const result = await updateAs();

    // Assert
    expect(result).toBe(updated);
  });

  it("refuses to update an admin role", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "admin" }),
    );

    // Act
    const promise = updateAs();

    // Assert
    await expectForbidden(promise, "You cannot modify this role.");
    expect(mocks.roleRepository.updateRole).not.toHaveBeenCalled();
  });

  it("refuses to update a client role", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "client" }),
    );

    // Act
    const promise = updateAs();

    // Assert
    await expectForbidden(promise, "You cannot modify this role.");
  });

  it("refuses to update a seller role", async () => {
    // Arrange
    mocks.roleRepository.findUniqueRole.mockResolvedValue(
      makeRole({ name: "seller" }),
    );

    // Act
    const promise = updateAs();

    // Assert
    await expectForbidden(promise, "You cannot modify this role.");
  });

  it("throws not found when role does not exist", async () => {
    // Arrange
    const notFoundError = new Error("Role not found");
    mocks.roleRepository.findUniqueRole.mockRejectedValue(notFoundError);

    // Act
    const promise = updateAs();

    // Assert
    await expect(promise).rejects.toBe(notFoundError);
    expect(mocks.roleRepository.updateRole).not.toHaveBeenCalled();
  });
});
