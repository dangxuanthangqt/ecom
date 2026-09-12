import { NotFoundException } from "@nestjs/common";

import { userSelect } from "@/selectors/user.selector";

import { UserService } from "../user.service";

import {
  ACTIVE_USER_ID,
  anyDate,
  ADMIN_ROLE_ID,
  CLIENT_ROLE_ID,
  expectForbidden,
  makeUser,
  SELLER_ROLE_ID,
  setupUserService,
  stubRoleIds,
  TARGET_USER_ID,
  UserServiceMocks,
} from "./user-service-test-harness";

describe("UserService - deleteUser", () => {
  let service: UserService;
  let mocks: UserServiceMocks;

  /** The lookup in getRoleOfTargetUser decides which role the target holds. */
  const arrangeTargetRole = (roleId: string) =>
    mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue({ roleId });

  const deleteAs = (activeRoleId: string) =>
    service.deleteUser({
      activeUserId: ACTIVE_USER_ID,
      activeRoleId,
      deletedUserId: TARGET_USER_ID,
    });

  beforeEach(async () => {
    ({ service, mocks } = await setupUserService());
    stubRoleIds(mocks);
    arrangeTargetRole(CLIENT_ROLE_ID);
    mocks.sharedUserRepository.updateUser.mockResolvedValue(makeUser());
  });

  it("refuses to delete your own account before touching the database", async () => {
    // Act
    const promise = service.deleteUser({
      activeUserId: ACTIVE_USER_ID,
      activeRoleId: ADMIN_ROLE_ID,
      deletedUserId: ACTIVE_USER_ID,
    });

    // Assert
    await expectForbidden(promise, "You cannot update your own user.");
    expect(mocks.sharedUserRepository.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mocks.sharedUserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("refuses a non-admin trying to delete an admin", async () => {
    // Arrange
    arrangeTargetRole(ADMIN_ROLE_ID);

    // Act
    const promise = deleteAs(SELLER_ROLE_ID);

    // Assert
    await expectForbidden(promise, "You are not allowed to delete admin user.");
    expect(mocks.sharedUserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("refuses an admin trying to delete another admin — same role", async () => {
    // Arrange
    arrangeTargetRole(ADMIN_ROLE_ID);

    // Act
    const promise = deleteAs(ADMIN_ROLE_ID);

    // Assert
    await expectForbidden(
      promise,
      "You cannot delete the user with the same role as you.",
    );
    expect(mocks.sharedUserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("refuses deleting a peer that holds the same non-admin role", async () => {
    // Arrange
    arrangeTargetRole(SELLER_ROLE_ID);

    // Act
    const promise = deleteAs(SELLER_ROLE_ID);

    // Assert
    await expectForbidden(
      promise,
      "You cannot delete the user with the same role as you.",
    );
    expect(mocks.sharedUserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("looks the target's role up by id, restricted to live rows", async () => {
    // Act
    await deleteAs(ADMIN_ROLE_ID);

    // Assert
    expect(mocks.sharedUserRepository.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: TARGET_USER_ID, deletedAt: null },
      select: { roleId: true },
    });
  });

  it("soft-deletes a client and stamps who removed them", async () => {
    // Act
    await deleteAs(ADMIN_ROLE_ID);

    // Assert
    expect(mocks.sharedUserRepository.updateUser).toHaveBeenCalledWith({
      where: { id: TARGET_USER_ID, deletedAt: null },
      data: {
        deletedAt: anyDate(),
        deletedById: ACTIVE_USER_ID,
        updatedById: ACTIVE_USER_ID,
      },
      select: userSelect,
    });
  });

  it("lets a non-admin delete a user holding a different non-admin role", async () => {
    // Arrange
    arrangeTargetRole(CLIENT_ROLE_ID);

    // Act
    await deleteAs(SELLER_ROLE_ID);

    // Assert
    expect(mocks.sharedUserRepository.updateUser).toHaveBeenCalledTimes(1);
  });

  it("returns the deleted row untouched", async () => {
    // Arrange
    const deleted = makeUser();
    mocks.sharedUserRepository.updateUser.mockResolvedValue(deleted);

    // Act
    const result = await deleteAs(ADMIN_ROLE_ID);

    // Assert
    expect(result).toBe(deleted);
  });

  it("propagates the lookup failure when the target does not exist", async () => {
    // Arrange
    const notFound = new NotFoundException({ message: "User not found." });
    mocks.sharedUserRepository.findUniqueOrThrow.mockRejectedValue(notFound);

    // Act
    const promise = deleteAs(ADMIN_ROLE_ID);

    // Assert
    await expect(promise).rejects.toBe(notFound);
    expect(mocks.sharedUserRepository.updateUser).not.toHaveBeenCalled();
  });
});
