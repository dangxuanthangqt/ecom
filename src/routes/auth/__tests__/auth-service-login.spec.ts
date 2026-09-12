import { UnprocessableEntityException } from "@nestjs/common";

import { VerificationCodeType } from "@/constants/verification-code.constant";
import { LoginRequestDto } from "src/dtos/auth/login.dto";

import { AuthService } from "../auth.service";

import {
  AuthServiceMocks,
  DEVICE_ID,
  expectBadRequestDetail,
  makeUser,
  makeVerificationCode,
  ROLE_ID,
  ROLE_NAME,
  setupAuthService,
  stubTokenGeneration,
  USER_ID,
} from "./auth-service-test-harness";

describe("AuthService - login", () => {
  let service: AuthService;
  let mocks: AuthServiceMocks;

  const ip = "127.0.0.1";
  const userAgent = "jest-agent";

  const makeBody = (overrides: Partial<LoginRequestDto> = {}) =>
    ({
      email: "user@example.com",
      password: "securePassword123",
      ...overrides,
    }) as LoginRequestDto;

  /** Everything needed for a login to reach the token-generation step. */
  const arrangeSuccessfulLogin = (
    user: ReturnType<typeof makeUser> = makeUser(),
  ) => {
    mocks.sharedUserRepository.findFirst.mockResolvedValue(user);
    mocks.hashingService.compare.mockReturnValue(true);
    mocks.deviceRepository.createDevice.mockResolvedValue({ id: DEVICE_ID });
    stubTokenGeneration(mocks);

    return user;
  };

  beforeEach(async () => {
    ({ service, mocks } = await setupAuthService());
  });

  it("returns both tokens and registers the device for a valid password", async () => {
    // Arrange
    arrangeSuccessfulLogin();

    // Act
    const result = await service.login({ body: makeBody(), ip, userAgent });

    // Assert
    expect(result).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(mocks.sharedUserRepository.findFirst).toHaveBeenCalledWith({
      where: { email: "user@example.com", deletedAt: null },
      include: { role: true },
    });
    expect(mocks.deviceRepository.createDevice).toHaveBeenCalledWith({
      userId: USER_ID,
      ip,
      isActive: true,
      userAgent,
    });
    expect(mocks.tokenService.signAccessToken).toHaveBeenCalledWith({
      userId: USER_ID,
      deviceId: DEVICE_ID,
      roleId: ROLE_ID,
      roleName: ROLE_NAME,
    });
    expect(
      mocks.twoFactorAuthenticationService.verifyTOTPCode,
    ).not.toHaveBeenCalled();
  });

  it("rejects an unknown email before touching the password", async () => {
    // Arrange
    mocks.sharedUserRepository.findFirst.mockResolvedValue(null);

    // Act & Assert
    await expectBadRequestDetail(
      service.login({ body: makeBody(), ip, userAgent }),
      { message: "Email is not found.", field: "email" },
    );
    expect(mocks.hashingService.compare).not.toHaveBeenCalled();
    expect(mocks.deviceRepository.createDevice).not.toHaveBeenCalled();
  });

  it("rejects a wrong password without creating a device", async () => {
    // Arrange
    mocks.sharedUserRepository.findFirst.mockResolvedValue(makeUser());
    mocks.hashingService.compare.mockReturnValue(false);

    // Act & Assert
    await expectBadRequestDetail(
      service.login({ body: makeBody(), ip, userAgent }),
      { message: "Password is not valid.", field: "password" },
    );
    expect(mocks.hashingService.compare).toHaveBeenCalledWith(
      "securePassword123",
      "hashed-password",
    );
    expect(mocks.deviceRepository.createDevice).not.toHaveBeenCalled();
  });

  describe("when 2FA is enabled", () => {
    const twoFactorUser = () => makeUser({ totpSecret: "TOTP-SECRET" });

    it("requires a totpCode or a verification code", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirst.mockResolvedValue(twoFactorUser());

      // Act & Assert
      await expectBadRequestDetail(
        service.login({ body: makeBody(), ip, userAgent }),
        {
          message: "TOTP or verification code is required.",
          field: "totpCode",
        },
      );
      expect(mocks.hashingService.compare).not.toHaveBeenCalled();
    });

    it("accepts a valid totpCode", async () => {
      // Arrange
      const user = arrangeSuccessfulLogin(twoFactorUser());
      mocks.twoFactorAuthenticationService.verifyTOTPCode.mockReturnValue(true);

      // Act
      const result = await service.login({
        body: makeBody({ totpCode: "123456" }),
        ip,
        userAgent,
      });

      // Assert
      expect(result.accessToken).toBe("access-token");
      expect(
        mocks.twoFactorAuthenticationService.verifyTOTPCode,
      ).toHaveBeenCalledWith({
        email: user.email,
        secret: "TOTP-SECRET",
        totpCode: "123456",
      });
      expect(
        mocks.verificationCodeRepository.findUnique,
      ).not.toHaveBeenCalled();
    });

    it("rejects an invalid totpCode", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirst.mockResolvedValue(twoFactorUser());
      mocks.twoFactorAuthenticationService.verifyTOTPCode.mockReturnValue(
        false,
      );

      // Act & Assert
      await expect(
        service.login({
          body: makeBody({ totpCode: "000000" }),
          ip,
          userAgent,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.deviceRepository.createDevice).not.toHaveBeenCalled();
    });

    it("falls back to the LOGIN verification code when no totpCode is given", async () => {
      // Arrange
      arrangeSuccessfulLogin(twoFactorUser());
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(
        makeVerificationCode({ type: VerificationCodeType.LOGIN }),
      );

      // Act
      const result = await service.login({
        body: makeBody({ code: "123456" }),
        ip,
        userAgent,
      });

      // Assert
      expect(result.refreshToken).toBe("refresh-token");
      expect(mocks.verificationCodeRepository.findUnique).toHaveBeenCalledWith({
        where: {
          email_code_type: {
            email: "user@example.com",
            code: "123456",
            type: VerificationCodeType.LOGIN,
          },
        },
      });
      expect(
        mocks.twoFactorAuthenticationService.verifyTOTPCode,
      ).not.toHaveBeenCalled();
    });

    it("rejects an invalid LOGIN verification code", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirst.mockResolvedValue(twoFactorUser());
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.login({ body: makeBody({ code: "999999" }), ip, userAgent }),
      ).rejects.toThrow("Verification code is not valid.");
      expect(mocks.hashingService.compare).not.toHaveBeenCalled();
    });
  });
});
