import { UnprocessableEntityException } from "@nestjs/common";

import {
  ProfileResponseDto,
  UpdateProfileResponseDto,
  ChangePasswordResponseDto,
} from "@/dtos/profile/profile.dto";

import { ProfileController } from "../profile.controller";

import {
  ACTIVE_USER_ID,
  ProfileControllerMocks,
  makeProfileResponse,
  setupProfileController,
} from "./profile-controller-test-harness";

describe("ProfileController - getProfile", () => {
  let controller: ProfileController;
  let mocks: ProfileControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupProfileController());
  });

  it("calls profileService.getProfile with the active user ID", async () => {
    // Arrange
    mocks.profileService.getProfile.mockResolvedValue(makeProfileResponse());

    // Act
    await controller.getProfile(ACTIVE_USER_ID);

    // Assert
    expect(mocks.profileService.getProfile).toHaveBeenCalledWith(
      ACTIVE_USER_ID,
    );
  });

  it("returns the profile wrapped in ProfileResponseDto", async () => {
    // Arrange
    const serviceResponse = makeProfileResponse({
      name: "John Doe",
      email: "john@example.com",
    });
    mocks.profileService.getProfile.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.getProfile(ACTIVE_USER_ID);

    // Assert
    expect(result).toBeInstanceOf(ProfileResponseDto);
    expect(result.name).toBe("John Doe");
  });

  it("propagates rejection from profileService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("User not found");
    mocks.profileService.getProfile.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getProfile(ACTIVE_USER_ID)).rejects.toBe(error);
  });
});

describe("ProfileController - updateProfile", () => {
  let controller: ProfileController;
  let mocks: ProfileControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupProfileController());
  });

  it("calls profileService.updateProfile with userId and data", async () => {
    // Arrange
    const body = { name: "Updated Name", phoneNumber: "0123456789" };
    mocks.profileService.updateProfile.mockResolvedValue(makeProfileResponse());

    // Act
    await controller.updateProfile(ACTIVE_USER_ID, body);

    // Assert
    expect(mocks.profileService.updateProfile).toHaveBeenCalledWith({
      userId: ACTIVE_USER_ID,
      data: body,
    });
  });

  it("returns the updated profile wrapped in UpdateProfileResponseDto", async () => {
    // Arrange
    const updated = makeProfileResponse({ name: "Updated Name" });
    mocks.profileService.updateProfile.mockResolvedValue(updated);

    // Act
    const result = await controller.updateProfile(ACTIVE_USER_ID, {
      name: "Updated Name",
    });

    // Assert
    expect(result).toBeInstanceOf(UpdateProfileResponseDto);
  });

  it("propagates rejection from profileService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Cannot update profile");
    mocks.profileService.updateProfile.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.updateProfile(ACTIVE_USER_ID, { name: "Updated" }),
    ).rejects.toBe(error);
  });
});

describe("ProfileController - changePassword", () => {
  let controller: ProfileController;
  let mocks: ProfileControllerMocks;

  const makeChangePasswordBody = () => ({
    currentPassword: "OldPass123",
    newPassword: "NewPass456",
    newConfirmPassword: "NewPass456",
  });

  beforeEach(async () => {
    ({ controller, mocks } = await setupProfileController());
  });

  it("calls profileService.changePassword with userId and data", async () => {
    // Arrange
    const body = makeChangePasswordBody();
    mocks.profileService.changePassword.mockResolvedValue({
      message: "Password changed",
    });

    // Act
    await controller.changePassword(ACTIVE_USER_ID, body);

    // Assert
    expect(mocks.profileService.changePassword).toHaveBeenCalledWith({
      userId: ACTIVE_USER_ID,
      data: body,
    });
  });

  it("returns the response wrapped in ChangePasswordResponseDto", async () => {
    // Arrange
    mocks.profileService.changePassword.mockResolvedValue({
      message: "Password changed",
    });

    // Act
    const result = await controller.changePassword(
      ACTIVE_USER_ID,
      makeChangePasswordBody(),
    );

    // Assert
    expect(result).toBeInstanceOf(ChangePasswordResponseDto);
  });

  it("propagates rejection from profileService on invalid current password", async () => {
    // Arrange
    const error = new UnprocessableEntityException(
      "Current password is incorrect",
    );
    mocks.profileService.changePassword.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.changePassword(ACTIVE_USER_ID, {
        currentPassword: "WrongPassword",
        newPassword: "NewPass456",
        newConfirmPassword: "NewPass456",
      }),
    ).rejects.toBe(error);
  });

  it("propagates rejection from profileService on validation error", async () => {
    // Arrange
    const error = new UnprocessableEntityException("New password is too weak");
    mocks.profileService.changePassword.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.changePassword(ACTIVE_USER_ID, {
        currentPassword: "OldPass123",
        newPassword: "weak",
        newConfirmPassword: "weak",
      }),
    ).rejects.toBe(error);
  });
});
