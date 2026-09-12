import { UnprocessableEntityException } from "@nestjs/common";

import { ForgotPasswordResponseDto } from "@/dtos/auth/forgot-password.dto";

import { AuthController } from "../auth.controller";

import {
  AuthControllerMocks,
  setupAuthController,
} from "./auth-controller-test-harness";

describe("AuthController - forgotPassword", () => {
  let controller: AuthController;
  let mocks: AuthControllerMocks;

  const makeForgotPasswordBody = () => ({
    email: "user@example.com",
    password: "NewPassword123",
    confirmPassword: "NewPassword123",
    code: "123456",
  });

  beforeEach(async () => {
    ({ controller, mocks } = await setupAuthController());
  });

  it("calls authService.forgotPassword with the request data", async () => {
    // Arrange
    const data = makeForgotPasswordBody();
    mocks.authService.forgotPassword.mockResolvedValue({
      message: "Password reset email sent",
    });

    // Act
    await controller.forgotPassword(data);

    // Assert
    expect(mocks.authService.forgotPassword).toHaveBeenCalledWith(data);
  });

  it("wraps the service response in ForgotPasswordResponseDto", async () => {
    // Arrange
    mocks.authService.forgotPassword.mockResolvedValue({
      message: "Email sent",
    });

    // Act
    const result = await controller.forgotPassword(makeForgotPasswordBody());

    // Assert
    expect(result).toBeInstanceOf(ForgotPasswordResponseDto);
  });

  it("propagates rejection from authService when user not found", async () => {
    // Arrange
    const error = new UnprocessableEntityException("User not found");
    mocks.authService.forgotPassword.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.forgotPassword(makeForgotPasswordBody()),
    ).rejects.toBe(error);
  });

  it("propagates rejection from authService on invalid code", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Invalid code");
    mocks.authService.forgotPassword.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.forgotPassword(makeForgotPasswordBody()),
    ).rejects.toBe(error);
  });
});
