import { ProfileService } from "../profile.service";

import {
  containing,
  makeUser,
  setupProfileService,
  USER_ID,
  ProfileServiceMocks,
} from "./profile-service-test-harness";

describe("ProfileService - changePassword", () => {
  let service: ProfileService;
  let mocks: ProfileServiceMocks;

  const setupPasswordChange = (currentPasswordValid: boolean) => {
    const user = makeUser({
      id: USER_ID,
      password: "hashed-old-password",
    });
    mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue(user);
    mocks.hashingService.compare.mockReturnValue(currentPasswordValid);
    mocks.hashingService.hash.mockReturnValue("hashed-new-password");
    mocks.prismaService.$transaction.mockImplementation((fn: unknown) =>
      (fn as (tx: unknown) => unknown)({
        user: {
          update: jest.fn().mockResolvedValue({}),
        },
        refreshToken: {
          updateMany: jest.fn().mockResolvedValue({}),
        },
        device: {
          updateMany: jest.fn().mockResolvedValue({}),
        },
      }),
    );
  };

  beforeEach(async () => {
    ({ service, mocks } = await setupProfileService());
  });

  it("changes the password and invalidates all refresh tokens when current password is correct", async () => {
    // Arrange
    setupPasswordChange(true);

    // Act
    const result = await service.changePassword({
      userId: USER_ID,
      data: {
        currentPassword: "old-password",
        newPassword: "new-password",
        newConfirmPassword: "new-password",
      },
    });

    // Assert
    expect(mocks.hashingService.compare).toHaveBeenCalledWith(
      "old-password",
      "hashed-old-password",
    );
    expect(mocks.hashingService.hash).toHaveBeenCalledWith("new-password");
    expect(mocks.prismaService.$transaction).toHaveBeenCalled();
    expect(result).toEqual({
      message:
        "Password changed successfully. You've been logged out from all devices.",
    });
  });

  it("verifies the current password against the stored hash", async () => {
    // Arrange
    setupPasswordChange(true);

    // Act
    await service.changePassword({
      userId: USER_ID,
      data: {
        currentPassword: "user-password",
        newPassword: "new-password",
        newConfirmPassword: "new-password",
      },
    });

    // Assert
    expect(mocks.hashingService.compare).toHaveBeenCalledWith(
      "user-password",
      "hashed-old-password",
    );
  });

  it("rejects when the current password is incorrect and persists nothing", async () => {
    // Arrange
    setupPasswordChange(false);

    // Act
    const promise = service.changePassword({
      userId: USER_ID,
      data: {
        currentPassword: "wrong-password",
        newPassword: "new-password",
        newConfirmPassword: "new-password",
      },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: { message: "Current password is incorrect." },
    });
    expect(mocks.prismaService.$transaction).not.toHaveBeenCalled();
  });

  it("hashes the new password before storing", async () => {
    // Arrange
    setupPasswordChange(true);

    // Act
    await service.changePassword({
      userId: USER_ID,
      data: {
        currentPassword: "old-password",
        newPassword: "new-password",
        newConfirmPassword: "new-password",
      },
    });

    // Assert
    expect(mocks.hashingService.hash).toHaveBeenCalledWith("new-password");
  });

  it("executes the transaction when password validation succeeds", async () => {
    // Arrange
    setupPasswordChange(true);

    // Act
    await service.changePassword({
      userId: USER_ID,
      data: {
        currentPassword: "old-password",
        newPassword: "new-password",
        newConfirmPassword: "new-password",
      },
    });

    // Assert
    expect(mocks.prismaService.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it("propagates user lookup failure", async () => {
    // Arrange
    const error = new Error("User not found");
    mocks.sharedUserRepository.findUniqueOrThrow.mockRejectedValue(error);

    // Act
    const promise = service.changePassword({
      userId: USER_ID,
      data: {
        currentPassword: "old-password",
        newPassword: "new-password",
        newConfirmPassword: "new-password",
      },
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("only finds deleted-at null users", async () => {
    // Arrange
    setupPasswordChange(true);

    // Act
    await service.changePassword({
      userId: USER_ID,
      data: {
        currentPassword: "old-password",
        newPassword: "new-password",
        newConfirmPassword: "new-password",
      },
    });

    // Assert
    expect(mocks.sharedUserRepository.findUniqueOrThrow).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
      }),
    );
  });

  it("propagates transaction errors", async () => {
    // Arrange
    setupPasswordChange(true);
    const transactionError = new Error("Transaction failed");
    mocks.prismaService.$transaction.mockRejectedValue(transactionError);

    // Act
    const promise = service.changePassword({
      userId: USER_ID,
      data: {
        currentPassword: "old-password",
        newPassword: "new-password",
        newConfirmPassword: "new-password",
      },
    });

    // Assert
    await expect(promise).rejects.toBe(transactionError);
  });
});
