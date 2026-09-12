import { DeletePermissionRequestDto } from "@/dtos/permission/permission.dto";

import { PermissionService } from "../permission.service";

import {
  CREATOR_USER_ID,
  makePermission,
  PERMISSION_ID,
  PermissionServiceMocks,
  setupPermissionService,
} from "./permission-service-test-harness";

describe("PermissionService - deletePermission", () => {
  let service: PermissionService;
  let mocks: PermissionServiceMocks;

  const makeBody = (overrides: Partial<DeletePermissionRequestDto> = {}) =>
    ({
      isHardDelete: false,
      ...overrides,
    }) as DeletePermissionRequestDto;

  const deleteAs = (
    id = PERMISSION_ID,
    body = makeBody(),
    userId = CREATOR_USER_ID,
  ) => service.deletePermission({ id, body, userId });

  beforeEach(async () => {
    ({ service, mocks } = await setupPermissionService());
    mocks.permissionRepository.deletePermission.mockResolvedValue(
      makePermission({ deletedAt: new Date() }),
    );
  });

  it("soft deletes a permission by default", async () => {
    // Arrange
    const body = makeBody({ isHardDelete: false });

    // Act
    await deleteAs(PERMISSION_ID, body);

    // Assert
    expect(mocks.permissionRepository.deletePermission).toHaveBeenCalledWith({
      id: PERMISSION_ID,
      userId: CREATOR_USER_ID,
      isHardDelete: false,
    });
  });

  it("hard deletes a permission when requested", async () => {
    // Arrange
    const body = makeBody({ isHardDelete: true });

    // Act
    await deleteAs(PERMISSION_ID, body);

    // Assert
    expect(mocks.permissionRepository.deletePermission).toHaveBeenCalledWith({
      id: PERMISSION_ID,
      userId: CREATOR_USER_ID,
      isHardDelete: true,
    });
  });

  it("returns the deleted permission from the repository", async () => {
    // Arrange
    const deleted = makePermission({
      id: PERMISSION_ID,
      deletedAt: new Date(),
    });
    mocks.permissionRepository.deletePermission.mockResolvedValue(deleted);

    // Act
    const result = await deleteAs();

    // Assert
    expect(result).toBe(deleted);
  });

  it("throws not found when permission does not exist", async () => {
    // Arrange
    const notFoundError = new Error("Permission not found");
    mocks.permissionRepository.deletePermission.mockRejectedValue(
      notFoundError,
    );

    // Act
    const promise = deleteAs();

    // Assert
    await expect(promise).rejects.toBe(notFoundError);
  });

  it("passes the userId to the repository for audit tracking", async () => {
    // Arrange
    const auditUserId = "99999999-9999-4999-8999-999999999999";

    // Act
    await deleteAs(PERMISSION_ID, makeBody(), auditUserId);

    // Assert
    expect(mocks.permissionRepository.deletePermission).toHaveBeenCalledWith({
      id: PERMISSION_ID,
      userId: auditUserId,
      isHardDelete: false,
    });
  });

  it("supports hard delete with undefined isHardDelete (falsy)", async () => {
    // Arrange
    const body = {
      isHardDelete: undefined,
    } as unknown as DeletePermissionRequestDto;

    // Act
    await deleteAs(PERMISSION_ID, body);

    // Assert
    expect(mocks.permissionRepository.deletePermission).toHaveBeenCalledWith({
      id: PERMISSION_ID,
      userId: CREATOR_USER_ID,
      isHardDelete: undefined,
    });
  });

  it("invalidates the whole role-permission cache after deleting", async () => {
    // Act
    await deleteAs();

    // Assert
    expect(
      mocks.rolePermissionCacheService.invalidateAll,
    ).toHaveBeenCalledTimes(1);
  });
});
