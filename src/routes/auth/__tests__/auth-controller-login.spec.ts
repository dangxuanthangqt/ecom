import { UnprocessableEntityException } from "@nestjs/common";

import { SendOTPResponseDto } from "@/dtos/auth/send-otp.dto";
import { LoginResponseDto, LoginRequestDto } from "src/dtos/auth/login.dto";
import {
  RegisterResponseDto,
  RegisterRequestDto,
} from "src/dtos/auth/register.dto";

import { AuthController } from "../auth.controller";

import {
  AuthControllerMocks,
  makeLoginResponse,
  makeRegisterResponse,
  makeSendOTPResponse,
  setupAuthController,
} from "./auth-controller-test-harness";

describe("AuthController - register", () => {
  let controller: AuthController;
  let mocks: AuthControllerMocks;

  const makeRegisterBody = () =>
    ({
      email: "user@example.com",
      password: "Password123",
      confirmPassword: "Password123",
      phoneNumber: "0987654321",
      name: "John Doe",
      code: "123456",
    }) as RegisterRequestDto;

  beforeEach(async () => {
    ({ controller, mocks } = await setupAuthController());
  });

  it("calls authService.register with the request body", async () => {
    // Arrange
    const body = makeRegisterBody();
    mocks.authService.register.mockResolvedValue(makeRegisterResponse());

    // Act
    await controller.register(body);

    // Assert
    expect(mocks.authService.register).toHaveBeenCalledWith(body);
  });

  it("wraps the service response in RegisterResponseDto", async () => {
    // Arrange
    const serviceResponse = makeRegisterResponse({
      id: "test-id",
      email: "user@example.com",
    });
    mocks.authService.register.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.register(makeRegisterBody());

    // Assert
    expect(result).toBeInstanceOf(RegisterResponseDto);
    expect(result.id).toBe("test-id");
  });

  it("propagates a rejection from authService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Email already exists");
    mocks.authService.register.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.register(makeRegisterBody())).rejects.toBe(error);
  });
});

describe("AuthController - login", () => {
  let controller: AuthController;
  let mocks: AuthControllerMocks;

  const makeLoginBody = () =>
    ({
      email: "user@example.com",
      password: "Password123",
    }) as LoginRequestDto;

  beforeEach(async () => {
    ({ controller, mocks } = await setupAuthController());
  });

  it("calls authService.login with body, ip, and userAgent", async () => {
    // Arrange
    const body = makeLoginBody();
    const ip = "192.168.1.1";
    const userAgent = "Mozilla/5.0";
    mocks.authService.login.mockResolvedValue(makeLoginResponse());

    // Act
    await controller.login(body, ip, userAgent);

    // Assert
    expect(mocks.authService.login).toHaveBeenCalledWith({
      body,
      ip,
      userAgent,
    });
  });

  it("wraps the service response in LoginResponseDto", async () => {
    // Arrange
    const serviceResponse = makeLoginResponse({
      accessToken: "token-123",
      refreshToken: "refresh-456",
    });
    mocks.authService.login.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.login(
      makeLoginBody(),
      "192.168.1.1",
      "Mozilla/5.0",
    );

    // Assert
    expect(result).toBeInstanceOf(LoginResponseDto);
    expect(result.accessToken).toBe("token-123");
  });

  it("propagates rejection from authService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Invalid credentials");
    mocks.authService.login.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.login(makeLoginBody(), "192.168.1.1", "Mozilla/5.0"),
    ).rejects.toBe(error);
  });
});

describe("AuthController - refreshToken", () => {
  let controller: AuthController;
  let mocks: AuthControllerMocks;

  const makeRefreshBody = () => ({ refreshToken: "refresh-token-123" });

  beforeEach(async () => {
    ({ controller, mocks } = await setupAuthController());
  });

  it("calls authService.refreshToken with body, ip, and userAgent", async () => {
    // Arrange
    const body = makeRefreshBody();
    const ip = "192.168.1.1";
    const userAgent = "Mozilla/5.0";
    mocks.authService.refreshToken.mockResolvedValue(makeLoginResponse());

    // Act
    await controller.refreshToken(body, ip, userAgent);

    // Assert
    expect(mocks.authService.refreshToken).toHaveBeenCalledWith({
      body,
      ip,
      userAgent,
    });
  });

  it("wraps the service response in LoginResponseDto (bug: should be RefreshTokenResponseDto)", async () => {
    // Arrange
    const serviceResponse = makeLoginResponse({
      accessToken: "new-token",
      refreshToken: "new-refresh",
    });
    mocks.authService.refreshToken.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.refreshToken(
      makeRefreshBody(),
      "192.168.1.1",
      "Mozilla/5.0",
    );

    // Assert
    // NOTE: The controller returns LoginResponseDto but the type hint says RefreshTokenResponseDto
    expect(result).toBeInstanceOf(LoginResponseDto);
  });

  it("propagates rejection from authService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Invalid refresh token");
    mocks.authService.refreshToken.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.refreshToken(makeRefreshBody(), "192.168.1.1", "Mozilla/5.0"),
    ).rejects.toBe(error);
  });
});

describe("AuthController - sendOTP", () => {
  let controller: AuthController;
  let mocks: AuthControllerMocks;

  const makeSendOTPBody = () => ({
    email: "user@example.com",
    type: "REGISTER" as const,
  });

  beforeEach(async () => {
    ({ controller, mocks } = await setupAuthController());
  });

  it("calls authService.sendOTP with the request data", async () => {
    // Arrange
    const data = makeSendOTPBody();
    mocks.authService.sendOTP.mockResolvedValue(makeSendOTPResponse());

    // Act
    await controller.sendOTP(data);

    // Assert
    expect(mocks.authService.sendOTP).toHaveBeenCalledWith(data);
  });

  it("wraps the service response in SendOTPResponseDto", async () => {
    // Arrange
    mocks.authService.sendOTP.mockResolvedValue({
      code: "123456",
      createdAt: new Date(),
      expiresAt: new Date(),
    });

    // Act
    const result = await controller.sendOTP(makeSendOTPBody());

    // Assert
    expect(result).toBeInstanceOf(SendOTPResponseDto);
  });

  it("propagates rejection from authService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Email not found");
    mocks.authService.sendOTP.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.sendOTP(makeSendOTPBody())).rejects.toBe(error);
  });
});
