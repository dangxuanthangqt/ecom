import { TokenService } from "../token.service";

import {
  setupTokenService,
  makeAccessTokenPayload,
  makeRefreshTokenPayload,
  containing,
  TokenServiceMocks,
} from "./token-service-test-harness";

jest.mock("uuid", () => ({
  v4: jest.fn<string, []>().mockReturnValue("mock-uuid-1234"),
}));

const { v4 } = jest.mocked(require("uuid"));

describe("TokenService", () => {
  let service: TokenService;
  let mocks: TokenServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupTokenService());
  });

  describe("signAccessToken", () => {
    it("signs access token with payload and expiration", () => {
      // Arrange
      const payload = makeAccessTokenPayload();
      mocks.jwtService.sign.mockReturnValue("access-token-value");

      // Act
      const token = service.signAccessToken(payload);

      // Assert
      expect(mocks.jwtService.sign).toHaveBeenCalledWith(
        containing({
          userId: payload.userId,
          deviceId: payload.deviceId,
          roleId: payload.roleId,
          roleName: payload.roleName,
          uuid: "mock-uuid-1234",
        }),
        containing({
          secret: "access-secret-key",
          expiresIn: "15m",
          algorithm: "HS256",
        }),
      );
      expect(token).toBe("access-token-value");
    });

    it("generates unique uuid for each token", () => {
      // Arrange
      const payload = makeAccessTokenPayload();
      mocks.jwtService.sign.mockReturnValue("token");
      const initialCallCount = v4.mock.calls.length;

      // Act
      service.signAccessToken(payload);
      service.signAccessToken(payload);

      // Assert
      expect(v4).toHaveBeenCalledTimes(initialCallCount + 2);
      expect(mocks.jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it("includes all required payload fields", () => {
      // Arrange
      const payload = makeAccessTokenPayload({
        userId: "custom-user",
        roleId: "custom-role",
      });
      mocks.jwtService.sign.mockReturnValue("token");

      // Act
      service.signAccessToken(payload);

      // Assert
      const signedPayload = mocks.jwtService.sign.mock.calls[0][0];
      expect(signedPayload).toEqual(
        containing({
          userId: "custom-user",
          roleId: "custom-role",
        }),
      );
    });

    it("uses HS256 algorithm and correct secret", () => {
      // Arrange
      const payload = makeAccessTokenPayload();
      mocks.jwtService.sign.mockReturnValue("token");

      // Act
      service.signAccessToken(payload);

      // Assert
      const options = mocks.jwtService.sign.mock.calls[0][1];
      expect(options.algorithm).toBe("HS256");
      expect(options.secret).toBe("access-secret-key");
    });
  });

  describe("signRefreshToken", () => {
    it("signs refresh token with payload and default expiration", () => {
      // Arrange
      const payload = makeRefreshTokenPayload();
      mocks.jwtService.sign.mockReturnValue("refresh-token-value");

      // Act
      const token = service.signRefreshToken(payload);

      // Assert
      expect(mocks.jwtService.sign).toHaveBeenCalledWith(
        containing({
          userId: payload.userId,
          uuid: "mock-uuid-1234",
        }),
        containing({
          secret: "refresh-secret-key",
          expiresIn: "7d",
          algorithm: "HS256",
        }),
      );
      expect(token).toBe("refresh-token-value");
    });

    it("uses custom expiration when provided", () => {
      // Arrange
      const payload = makeRefreshTokenPayload({ expiresIn: "30d" });
      mocks.jwtService.sign.mockReturnValue("token");

      // Act
      service.signRefreshToken(payload);

      // Assert
      const options = mocks.jwtService.sign.mock.calls[0][1];
      expect(options.expiresIn).toBe("30d");
    });

    it("falls back to default expiration when not provided", () => {
      // Arrange
      const payload = makeRefreshTokenPayload();
      mocks.jwtService.sign.mockReturnValue("token");

      // Act
      service.signRefreshToken(payload);

      // Assert
      const options = mocks.jwtService.sign.mock.calls[0][1];
      expect(options.expiresIn).toBe("7d");
    });

    it("uses HS256 algorithm and correct secret", () => {
      // Arrange
      const payload = makeRefreshTokenPayload();
      mocks.jwtService.sign.mockReturnValue("token");

      // Act
      service.signRefreshToken(payload);

      // Assert
      const options = mocks.jwtService.sign.mock.calls[0][1];
      expect(options.algorithm).toBe("HS256");
      expect(options.secret).toBe("refresh-secret-key");
    });

    it("allows token rotation with custom expiration", () => {
      // Arrange
      const payload = makeRefreshTokenPayload({ expiresIn: "14d" });
      mocks.jwtService.sign.mockReturnValue("new-refresh-token");

      // Act
      const token = service.signRefreshToken(payload);

      // Assert
      expect(token).toBe("new-refresh-token");
      expect(mocks.jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        containing({ expiresIn: "14d" }),
      );
    });
  });

  describe("verifyAccessToken", () => {
    it("verifies access token and returns payload", async () => {
      // Arrange
      const expectedPayload = makeAccessTokenPayload();
      const token = "valid-access-token";
      mocks.jwtService.verifyAsync.mockResolvedValue(expectedPayload);

      // Act
      const result = await service.verifyAccessToken(token);

      // Assert
      expect(mocks.jwtService.verifyAsync).toHaveBeenCalledWith(
        token,
        containing({
          secret: "access-secret-key",
        }),
      );
      expect(result).toEqual(expectedPayload);
    });

    it("uses access token secret for verification", async () => {
      // Arrange
      const token = "token";
      mocks.jwtService.verifyAsync.mockResolvedValue({});

      // Act
      await service.verifyAccessToken(token);

      // Assert
      const options = mocks.jwtService.verifyAsync.mock.calls[0][1];
      expect(options.secret).toBe("access-secret-key");
    });

    it("throws error for invalid token", async () => {
      // Arrange
      const token = "invalid-token";
      const error = new Error("jwt malformed");
      mocks.jwtService.verifyAsync.mockRejectedValue(error);

      // Act & Assert
      await expect(service.verifyAccessToken(token)).rejects.toThrow(error);
    });

    it("throws error for expired token", async () => {
      // Arrange
      const token = "expired-token";
      const error = new Error("jwt expired");
      mocks.jwtService.verifyAsync.mockRejectedValue(error);

      // Act & Assert
      await expect(service.verifyAccessToken(token)).rejects.toThrow(error);
    });

    it("returns payload with all token claims", async () => {
      // Arrange
      const tokenPayload = {
        ...makeAccessTokenPayload(),
        exp: 1234567890,
        iat: 1234567800,
        uuid: "token-uuid",
      };
      mocks.jwtService.verifyAsync.mockResolvedValue(tokenPayload);

      // Act
      const result = await service.verifyAccessToken("token");

      // Assert
      expect(result).toEqual(tokenPayload);
    });
  });

  describe("verifyRefreshToken", () => {
    it("verifies refresh token and returns payload", async () => {
      // Arrange
      const expectedPayload = makeRefreshTokenPayload();
      const token = "valid-refresh-token";
      mocks.jwtService.verifyAsync.mockResolvedValue(expectedPayload);

      // Act
      const result = await service.verifyRefreshToken(token);

      // Assert
      expect(mocks.jwtService.verifyAsync).toHaveBeenCalledWith(
        token,
        containing({
          secret: "refresh-secret-key",
        }),
      );
      expect(result).toEqual(expectedPayload);
    });

    it("uses refresh token secret for verification", async () => {
      // Arrange
      const token = "token";
      mocks.jwtService.verifyAsync.mockResolvedValue({});

      // Act
      await service.verifyRefreshToken(token);

      // Assert
      const options = mocks.jwtService.verifyAsync.mock.calls[0][1];
      expect(options.secret).toBe("refresh-secret-key");
    });

    it("throws error for invalid refresh token", async () => {
      // Arrange
      const token = "invalid-refresh-token";
      const error = new Error("jwt malformed");
      mocks.jwtService.verifyAsync.mockRejectedValue(error);

      // Act & Assert
      await expect(service.verifyRefreshToken(token)).rejects.toThrow(error);
    });

    it("throws error for expired refresh token", async () => {
      // Arrange
      const token = "expired-refresh-token";
      const error = new Error("jwt expired");
      mocks.jwtService.verifyAsync.mockRejectedValue(error);

      // Act & Assert
      await expect(service.verifyRefreshToken(token)).rejects.toThrow(error);
    });

    it("returns payload with user id", async () => {
      // Arrange
      const tokenPayload = {
        userId: "user-123",
        exp: 1234567890,
        iat: 1234567800,
        uuid: "token-uuid",
      };
      mocks.jwtService.verifyAsync.mockResolvedValue(tokenPayload);

      // Act
      const result = await service.verifyRefreshToken("token");

      // Assert
      expect(result.userId).toBe("user-123");
    });
  });
});
