import { UnauthorizedException } from "@nestjs/common";

import { AuthService } from "../auth.service";

import {
  AuthServiceMocks,
  DEVICE_ID,
  ROLE_ID,
  ROLE_NAME,
  setupAuthService,
  stubTokenGeneration,
  USER_ID,
} from "./auth-service-test-harness";

describe("AuthService - token lifecycle", () => {
  let service: AuthService;
  let mocks: AuthServiceMocks;

  const NOW = new Date("2026-01-01T00:00:00.000Z");
  const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);
    ({ service, mocks } = await setupAuthService());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("generateTokens", () => {
    it("persists the refresh token with the expiry decoded from it", async () => {
      // Arrange
      const exp = NOW_SECONDS + 3600;
      stubTokenGeneration(mocks, exp);

      // Act
      const result = await service.generateTokens({
        userId: USER_ID,
        deviceId: DEVICE_ID,
        roleId: ROLE_ID,
        roleName: ROLE_NAME,
      });

      // Assert
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
      expect(mocks.tokenService.signRefreshToken).toHaveBeenCalledWith({
        userId: USER_ID,
        expiresIn: undefined,
      });
      expect(
        mocks.refreshTokenRepository.createRefreshToken,
      ).toHaveBeenCalledWith({
        token: "refresh-token",
        userId: USER_ID,
        expiresAt: new Date(exp * 1000),
        deviceId: DEVICE_ID,
      });
    });

    it("forwards an explicit expiresIn so a rotated token keeps the original lifetime", async () => {
      // Arrange
      stubTokenGeneration(mocks);

      // Act
      await service.generateTokens({
        userId: USER_ID,
        deviceId: DEVICE_ID,
        roleId: ROLE_ID,
        roleName: ROLE_NAME,
        expiresIn: 120,
      });

      // Assert
      expect(mocks.tokenService.signRefreshToken).toHaveBeenCalledWith({
        userId: USER_ID,
        expiresIn: 120,
      });
    });
  });

  describe("refreshToken", () => {
    const oldToken = "old-refresh-token";
    const ip = "10.0.0.1";
    const userAgent = "jest-agent";
    const oldExp = NOW_SECONDS + 600;

    const arrangeRefresh = () => {
      mocks.tokenService.verifyRefreshToken.mockImplementation(
        (token: string) =>
          Promise.resolve(
            token === oldToken
              ? { userId: USER_ID, exp: oldExp }
              : { userId: USER_ID, exp: NOW_SECONDS + 600 },
          ),
      );
      mocks.refreshTokenRepository.findUniqueOrThrow.mockResolvedValue({
        deviceId: DEVICE_ID,
        user: { role: { id: ROLE_ID, name: ROLE_NAME } },
      });
      mocks.refreshTokenRepository.delete.mockResolvedValue({
        token: oldToken,
        deviceId: DEVICE_ID,
      });
      mocks.deviceRepository.updateDevice.mockResolvedValue({ id: DEVICE_ID });
      mocks.tokenService.signAccessToken.mockReturnValue("access-token");
      mocks.tokenService.signRefreshToken.mockReturnValue("refresh-token");
      mocks.refreshTokenRepository.createRefreshToken.mockResolvedValue({
        token: "refresh-token",
      });
    };

    it("rotates the token, revokes the old one and refreshes the device metadata", async () => {
      // Arrange
      arrangeRefresh();

      // Act
      const result = await service.refreshToken({
        body: { refreshToken: oldToken },
        ip,
        userAgent,
      });

      // Assert
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
      expect(mocks.refreshTokenRepository.delete).toHaveBeenCalledWith({
        where: { token: oldToken },
      });
      expect(mocks.deviceRepository.updateDevice).toHaveBeenCalledWith({
        where: { id: DEVICE_ID },
        data: { ip, userAgent },
      });
      // Rotation keeps the remaining lifetime of the old token.
      expect(mocks.tokenService.signRefreshToken).toHaveBeenCalledWith({
        userId: USER_ID,
        expiresIn: oldExp - NOW_SECONDS,
      });
    });

    it("rejects an unverifiable refresh token without deleting anything", async () => {
      // Arrange
      mocks.tokenService.verifyRefreshToken.mockRejectedValue(
        new UnauthorizedException("Invalid refresh token."),
      );

      // Act & Assert
      await expect(
        service.refreshToken({
          body: { refreshToken: oldToken },
          ip,
          userAgent,
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mocks.refreshTokenRepository.delete).not.toHaveBeenCalled();
      expect(mocks.deviceRepository.updateDevice).not.toHaveBeenCalled();
    });

    it("rejects a token that is valid but no longer stored", async () => {
      // Arrange
      arrangeRefresh();
      mocks.refreshTokenRepository.findUniqueOrThrow.mockRejectedValue(
        new Error("No RefreshToken found"),
      );

      // Act & Assert
      await expect(
        service.refreshToken({
          body: { refreshToken: oldToken },
          ip,
          userAgent,
        }),
      ).rejects.toThrow("No RefreshToken found");
      expect(mocks.refreshTokenRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("deletes the refresh token and deactivates its device", async () => {
      // Arrange
      mocks.refreshTokenRepository.delete.mockResolvedValue({
        token: "refresh-token",
        deviceId: DEVICE_ID,
      });
      mocks.deviceRepository.updateDevice.mockResolvedValue({ id: DEVICE_ID });

      // Act
      const result = await service.logout({ refreshToken: "refresh-token" });

      // Assert
      expect(result).toEqual({ message: "Logout successfully." });
      expect(mocks.refreshTokenRepository.delete).toHaveBeenCalledWith({
        where: { token: "refresh-token" },
      });
      expect(mocks.deviceRepository.updateDevice).toHaveBeenCalledWith({
        where: { id: DEVICE_ID },
        data: { isActive: false },
      });
    });

    it("leaves the device untouched when the token does not exist", async () => {
      // Arrange
      mocks.refreshTokenRepository.delete.mockRejectedValue(
        new Error("Record to delete does not exist."),
      );

      // Act & Assert
      await expect(
        service.logout({ refreshToken: "missing-token" }),
      ).rejects.toThrow("Record to delete does not exist.");
      expect(mocks.deviceRepository.updateDevice).not.toHaveBeenCalled();
    });
  });
});
