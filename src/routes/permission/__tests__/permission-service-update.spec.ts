import { UpdatePermissionRequestDto } from "@/dtos/permission/permission.dto";

import { PermissionService } from "../permission.service";

import {
  containing,
  CREATOR_USER_ID,
  makePermission,
  PERMISSION_ID,
  ROLE_ID_1,
  ROLE_ID_2,
  PermissionServiceMocks,
  setupPermissionService,
} from "./permission-service-test-harness";

describe("PermissionService - updatePermission", () => {
  let service: PermissionService;
  let mocks: PermissionServiceMocks;

  const makeBody = (overrides: Partial<UpdatePermissionRequestDto> = {}) =>
    ({
      name: "Update User",
      description: "Allows updating users",
      path: "/users/update",
      method: "PUT",
      rolesIds: [ROLE_ID_1],
      ...overrides,
    }) as UpdatePermissionRequestDto;

  const updateAs = (id = PERMISSION_ID, body = makeBody()) =>
    service.updatePermission({ id, body, userId: CREATOR_USER_ID });

  beforeEach(async () => {
    ({ service, mocks } = await setupPermissionService());
    mocks.permissionRepository.updatePermission.mockResolvedValue(
      makePermission(),
    );
  });

  it("updates the permission with new details", async () => {
    // Arrange
    const body = makeBody({
      name: "Patch User",
      description: "Allows patching user fields",
      path: "/users/patch",
      method: "PATCH",
    });

    // Act
    await updateAs(PERMISSION_ID, body);

    // Assert
    expect(mocks.permissionRepository.updatePermission).toHaveBeenCalledWith(
      containing({
        id: PERMISSION_ID,
        data: containing({
          name: "Patch User",
          description: "Allows patching user fields",
          path: "/users/patch",
          method: "PATCH",
          updatedById: CREATOR_USER_ID,
        }),
      }),
    );
  });

  it("maps rolesIds array to roles.set format", async () => {
    // Arrange
    const body = makeBody({ rolesIds: [ROLE_ID_1, ROLE_ID_2] });

    // Act
    await updateAs(PERMISSION_ID, body);

    // Assert
    expect(mocks.permissionRepository.updatePermission).toHaveBeenCalledWith(
      containing({
        data: containing({
          roles: {
            set: [{ id: ROLE_ID_1 }, { id: ROLE_ID_2 }],
          },
        }),
      }),
    );
  });

  it("handles undefined rolesIds by mapping to undefined set", async () => {
    // Arrange
    const body = makeBody({ rolesIds: undefined });

    // Act
    await updateAs(PERMISSION_ID, body);

    // Assert
    expect(mocks.permissionRepository.updatePermission).toHaveBeenCalledWith(
      containing({
        data: containing({
          roles: {
            set: undefined,
          },
        }),
      }),
    );
  });

  it("stamps the updater userId on the updated permission", async () => {
    // Arrange
    const body = makeBody();

    // Act
    await updateAs(PERMISSION_ID, body);

    // Assert
    expect(mocks.permissionRepository.updatePermission).toHaveBeenCalledWith(
      containing({
        data: containing({
          updatedById: CREATOR_USER_ID,
        }),
      }),
    );
  });

  it("returns the updated permission from the repository", async () => {
    // Arrange
    const updated = makePermission({ id: PERMISSION_ID, name: "Updated" });
    mocks.permissionRepository.updatePermission.mockResolvedValue(updated);

    // Act
    const result = await updateAs();

    // Assert
    expect(result).toBe(updated);
  });

  it("propagates not found error from the repository", async () => {
    // Arrange
    const notFoundError = new Error("Permission not found");
    mocks.permissionRepository.updatePermission.mockRejectedValue(
      notFoundError,
    );

    // Act
    const promise = updateAs();

    // Assert
    await expect(promise).rejects.toBe(notFoundError);
  });

  it("propagates validation errors from the repository", async () => {
    // Arrange
    const error = new Error("Duplicate permission");
    mocks.permissionRepository.updatePermission.mockRejectedValue(error);

    // Act
    const promise = updateAs();

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});
