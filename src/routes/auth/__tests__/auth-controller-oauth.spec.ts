import { Response } from "express";

import { AuthController } from "../auth.controller";

import {
  AuthControllerMocks,
  setupAuthController,
} from "./auth-controller-test-harness";

describe("AuthController - getAuthorizationUrl", () => {
  let controller: AuthController;
  let mocks: AuthControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupAuthController());
  });

  it("calls googleService.getAuthorizationUrl with ip and userAgent", () => {
    // Arrange
    const ip = "192.168.1.1";
    const userAgent = "Mozilla/5.0";
    const url = "https://accounts.google.com/o/oauth2/v2/auth?...";
    mocks.googleService.getAuthorizationUrl.mockReturnValue({ url });

    // Act
    const result = controller.getAuthorizationUrl(ip, userAgent);

    // Assert
    expect(mocks.googleService.getAuthorizationUrl).toHaveBeenCalledWith({
      ip,
      userAgent,
    });
  });

  it("returns the authorization URL in an object", () => {
    // Arrange
    const expectedUrl = "https://accounts.google.com/o/oauth2/v2/auth?...";
    mocks.googleService.getAuthorizationUrl.mockReturnValue({
      url: expectedUrl,
    });

    // Act
    const result = controller.getAuthorizationUrl("192.168.1.1", "Mozilla/5.0");

    // Assert
    // Controller returns { url: serviceResult } where serviceResult is { url: "..." }
    expect(result).toEqual({ url: { url: expectedUrl } });
  });
});

describe("AuthController - googleCallback", () => {
  let controller: AuthController;
  let mocks: AuthControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupAuthController());
  });

  it("calls googleService.googleCallback with code and state", async () => {
    // Arrange
    const code = "auth-code-123";
    const state = "state-456";
    const mockRes = {
      redirect: jest.fn().mockReturnValue(undefined),
    } as unknown as Response;
    mocks.googleService.googleCallback.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    // Act
    await controller.googleCallback(code, state, mockRes);

    // Assert
    expect(mocks.googleService.googleCallback).toHaveBeenCalledWith(
      code,
      state,
    );
  });

  it("redirects to client with tokens on success", async () => {
    // Arrange
    const mockRes = {
      redirect: jest.fn().mockReturnValue(undefined),
    } as unknown as Response;
    mocks.googleService.googleCallback.mockResolvedValue({
      accessToken: "token-123",
      refreshToken: "refresh-456",
    });

    // Act
    await controller.googleCallback("code", "state", mockRes);

    // Assert
    const redirectUrl = (mockRes.redirect as jest.Mock).mock.calls[0][0];
    expect(redirectUrl).toContain("http://localhost:3000/auth/callback");
    expect(redirectUrl).toContain("accessToken=token-123");
    expect(redirectUrl).toContain("refreshToken=refresh-456");
  });

  it("redirects to client with error message on service failure", async () => {
    // Arrange
    const mockRes = {
      redirect: jest.fn().mockReturnValue(undefined),
    } as unknown as Response;
    mocks.googleService.googleCallback.mockRejectedValue(
      new Error("Google OAuth failed"),
    );

    // Act
    await controller.googleCallback("bad-code", "state", mockRes);

    // Assert
    const redirectUrl = (mockRes.redirect as jest.Mock).mock.calls[0][0];
    expect(redirectUrl).toContain("http://localhost:3000/auth/callback");
    expect(redirectUrl).toContain("errorMessage=Failed+to+google+login");
  });
});
