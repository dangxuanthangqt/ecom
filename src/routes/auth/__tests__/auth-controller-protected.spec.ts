import { UnprocessableEntityException } from "@nestjs/common";

import {
  EnableTwoFactorAuthenticationResponseDto,
  Disable2faResponseDto,
} from "@/dtos/auth/2fa.dto";
import { LogoutResponseDto } from "@/dtos/auth/logout.dto";

import { AuthController } from "../auth.controller";

import {
  ACTIVE_USER_ID,
  AuthControllerMocks,
  setupAuthController,
} from "./auth-controller-test-harness";

describe("AuthController - logout", () => {
  let controller: AuthController;
  let mocks: AuthControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupAuthController());
  });

  it("calls authService.logout with the request body", async () => {
    // Arrange
    const data = { refreshToken: "refresh-token-123" };
    mocks.authService.logout.mockResolvedValue({ message: "Logged out" });

    // Act
    await controller.logout(data);

    // Assert
    expect(mocks.authService.logout).toHaveBeenCalledWith(data);
  });

  it("wraps the service response in LogoutResponseDto", async () => {
    // Arrange
    mocks.authService.logout.mockResolvedValue({ message: "Logged out" });

    // Act
    const result = await controller.logout({ refreshToken: "token-123" });

    // Assert
    expect(result).toBeInstanceOf(LogoutResponseDto);
  });

  it("propagates rejection from authService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Invalid token");
    mocks.authService.logout.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.logout({ refreshToken: "bad-token" })).rejects.toBe(
      error,
    );
  });
});

describe("AuthController - enable2fa", () => {
  let controller: AuthController;
  let mocks: AuthControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupAuthController());
  });

  it("calls authService.setupTwoFactorAuthentication with userId", async () => {
    // Arrange
    mocks.authService.setupTwoFactorAuthentication.mockResolvedValue({
      secret: "secret-key",
      qrCode: "data:image/png;base64,...",
    });

    // Act
    await controller.enable2fa(ACTIVE_USER_ID);

    // Assert
    expect(mocks.authService.setupTwoFactorAuthentication).toHaveBeenCalledWith(
      ACTIVE_USER_ID,
    );
  });

  it("wraps the service response in EnableTwoFactorAuthenticationResponseDto", async () => {
    // Arrange
    mocks.authService.setupTwoFactorAuthentication.mockResolvedValue({
      secret: "secret-key",
      qrCode: "data:image/png;base64,...",
    });

    // Act
    const result = await controller.enable2fa(ACTIVE_USER_ID);

    // Assert
    expect(result).toBeInstanceOf(EnableTwoFactorAuthenticationResponseDto);
  });

  it("propagates rejection from authService", async () => {
    // Arrange
    const error = new UnprocessableEntityException(
      "User already has 2FA enabled",
    );
    mocks.authService.setupTwoFactorAuthentication.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.enable2fa(ACTIVE_USER_ID)).rejects.toBe(error);
  });
});

describe("AuthController - disable2fa", () => {
  let controller: AuthController;
  let mocks: AuthControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupAuthController());
  });

  it("calls authService.disableTwoFactorAuthentication with body and userId", async () => {
    // Arrange
    const body = { totpCode: "123456" };
    mocks.authService.disableTwoFactorAuthentication.mockResolvedValue({
      message: "2FA disabled",
    });

    // Act
    await controller.disable2fa(body, ACTIVE_USER_ID);

    // Assert
    expect(
      mocks.authService.disableTwoFactorAuthentication,
    ).toHaveBeenCalledWith({
      ...body,
      userId: ACTIVE_USER_ID,
    });
  });

  it("wraps the service response in Disable2faResponseDto", async () => {
    // Arrange
    mocks.authService.disableTwoFactorAuthentication.mockResolvedValue({
      message: "2FA disabled",
    });

    // Act
    const result = await controller.disable2fa(
      { totpCode: "123456" },
      ACTIVE_USER_ID,
    );

    // Assert
    expect(result).toBeInstanceOf(Disable2faResponseDto);
  });

  it("propagates rejection from authService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Invalid TOTP code");
    mocks.authService.disableTwoFactorAuthentication.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.disable2fa({ totpCode: "wrong" }, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});
