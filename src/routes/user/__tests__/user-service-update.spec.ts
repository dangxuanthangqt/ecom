import { NotFoundException } from "@nestjs/common";

import { UpdateUserRequestDto } from "@/dtos/user/user.dto";
import { userWithRoleSelect } from "@/selectors/user.selector";

import { UserService } from "../user.service";

import {
  ACTIVE_USER_ID,
  ADMIN_ROLE_ID,
  CLIENT_ROLE_ID,
  containing,
  expectForbidden,
  makeUser,
  SELLER_ROLE_ID,
  setupUserService,
  stubRoleIds,
  TARGET_USER_ID,
  UserServiceMocks,
} from "./user-service-test-harness";

describe("UserService - updateUser", () => {
  let service: UserService;
  let mocks: UserServiceMocks;

  const makeBody = (overrides: Partial<UpdateUserRequestDto> = {}) =>
    ({ name: "Renamed", ...overrides }) as UpdateUserRequestDto;

  /** The lookup in getRoleOfTargetUser decides which role the target holds. */
  const arrangeTargetRole = (roleId: string) =>
    mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue({ roleId });

  const updateAs = (activeRoleId: string, body = makeBody()) =>
    service.updateUser({
      activeUserId: ACTIVE_USER_ID,
      activeRoleId,
      updatedUserId: TARGET_USER_ID,
      body,
    });

  beforeEach(async () => {
    ({ service, mocks } = await setupUserService());
    stubRoleIds(mocks);
    arrangeTargetRole(CLIENT_ROLE_ID);
    mocks.hashingService.hash.mockReturnValue("hashed-password");
    mocks.sharedUserRepository.updateUser.mockResolvedValue(makeUser());
  });

  it("refuses to update your own account before touching the database", async () => {
    // Arrange
    const body = makeBody();

    // Act
    const promise = service.updateUser({
      activeUserId: ACTIVE_USER_ID,
      activeRoleId: ADMIN_ROLE_ID,
      updatedUserId: ACTIVE_USER_ID,
      body,
    });

    // Assert
    await expectForbidden(promise, "You cannot update your own user.");
    expect(mocks.sharedUserRepository.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mocks.sharedUserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("refuses a non-admin trying to update an admin", async () => {
    // Arrange
    arrangeTargetRole(ADMIN_ROLE_ID);

    // Act
    const promise = updateAs(SELLER_ROLE_ID);

    // Assert
    await expectForbidden(promise, "You are not allowed to update this user.");
    expect(mocks.sharedUserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("refuses a non-admin trying to promote someone to admin", async () => {
    // Arrange
    const body = makeBody({ roleId: ADMIN_ROLE_ID });

    // Act
    const promise = updateAs(SELLER_ROLE_ID, body);

    // Assert
    await expectForbidden(
      promise,
      "You are not allowed to update the user to an admin.",
    );
    expect(mocks.sharedUserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("lets an admin update an admin and promote them", async () => {
    // Arrange
    arrangeTargetRole(ADMIN_ROLE_ID);
    const body = makeBody({ roleId: ADMIN_ROLE_ID });

    // Act
    await updateAs(ADMIN_ROLE_ID, body);

    // Assert
    expect(mocks.sharedUserRepository.updateUser).toHaveBeenCalledWith(
      containing({
        data: containing({ roleId: ADMIN_ROLE_ID }),
      }),
    );
  });

  it("lets a non-admin update a non-admin target that keeps its role", async () => {
    // Act
    await updateAs(SELLER_ROLE_ID, makeBody({ roleId: CLIENT_ROLE_ID }));

    // Assert
    expect(mocks.sharedUserRepository.updateUser).toHaveBeenCalledTimes(1);
  });

  it("hashes a supplied password and stamps the editor onto the row", async () => {
    // Arrange
    const body = makeBody({
      password: "newPassword123",
      phoneNumber: "0123456789",
      avatar: "https://example.com/b.jpg",
      status: "INACTIVE",
      roleId: CLIENT_ROLE_ID,
    });

    // Act
    await updateAs(ADMIN_ROLE_ID, body);

    // Assert
    expect(mocks.hashingService.hash).toHaveBeenCalledWith("newPassword123");
    expect(mocks.sharedUserRepository.updateUser).toHaveBeenCalledWith({
      where: { id: TARGET_USER_ID, deletedAt: null },
      data: {
        name: "Renamed",
        phoneNumber: "0123456789",
        roleId: CLIENT_ROLE_ID,
        avatar: "https://example.com/b.jpg",
        status: "INACTIVE",
        password: "hashed-password",
        updatedById: ACTIVE_USER_ID,
      },
      select: { ...userWithRoleSelect, updatedAt: true },
    });
  });

  it("leaves the stored password alone when none is supplied", async () => {
    // Act
    await updateAs(ADMIN_ROLE_ID, makeBody());

    // Assert
    expect(mocks.hashingService.hash).not.toHaveBeenCalled();
    expect(mocks.sharedUserRepository.updateUser).toHaveBeenCalledWith(
      containing({
        data: containing({ password: undefined }),
      }),
    );
  });

  it("returns the updated row untouched", async () => {
    // Arrange
    const updated = makeUser({ name: "Renamed" });
    mocks.sharedUserRepository.updateUser.mockResolvedValue(updated);

    // Act
    const result = await updateAs(ADMIN_ROLE_ID);

    // Assert
    expect(result).toBe(updated);
  });

  it("propagates the lookup failure when the target does not exist", async () => {
    // Arrange
    const notFound = new NotFoundException({ message: "User not found." });
    mocks.sharedUserRepository.findUniqueOrThrow.mockRejectedValue(notFound);

    // Act
    const promise = updateAs(ADMIN_ROLE_ID);

    // Assert
    await expect(promise).rejects.toBe(notFound);
    expect(mocks.sharedUserRepository.updateUser).not.toHaveBeenCalled();
  });
});
