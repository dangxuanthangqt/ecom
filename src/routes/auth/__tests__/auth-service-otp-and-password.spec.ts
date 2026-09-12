import { UnprocessableEntityException } from "@nestjs/common";

import { VerificationCodeType } from "@/constants/verification-code.constant";
import { ForgotPasswordRequestDto } from "@/dtos/auth/forgot-password.dto";
import { SendOTPRequestDto } from "@/dtos/auth/send-otp.dto";

import { AuthService } from "../auth.service";

import {
  AuthServiceMocks,
  makeUser,
  makeVerificationCode,
  setupAuthService,
  USER_ID,
} from "./auth-service-test-harness";

describe("AuthService - OTP & password recovery", () => {
  let service: AuthService;
  let mocks: AuthServiceMocks;

  const NOW = new Date("2026-01-01T00:00:00.000Z");

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);
    ({ service, mocks } = await setupAuthService());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("sendOTP", () => {
    const makeBody = (type: SendOTPRequestDto["type"]): SendOTPRequestDto => ({
      email: "user@example.com",
      type,
    });

    it("creates a 6-digit code expiring after the configured window for a new email", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirst.mockResolvedValue(null);
      mocks.verificationCodeRepository.createVerificationCode.mockImplementation(
        (input: Record<string, unknown>) => Promise.resolve(input),
      );

      // Act
      const result = await service.sendOTP(
        makeBody(VerificationCodeType.REGISTER),
      );

      // Assert - otpExpiresIn is "5m" in the mocked config
      expect(result).toMatchObject({
        email: "user@example.com",
        type: VerificationCodeType.REGISTER,
        expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
      });
      expect(result.code).toMatch(/^\d{6}$/);
    });

    it("rejects registration when the email already belongs to a user", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirst.mockResolvedValue(makeUser());

      // Act & Assert
      await expect(
        service.sendOTP(makeBody(VerificationCodeType.REGISTER)),
      ).rejects.toThrow("Email is already exist.");
      expect(
        mocks.verificationCodeRepository.createVerificationCode,
      ).not.toHaveBeenCalled();
    });

    it("rejects password recovery when the email is unknown", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.sendOTP(makeBody(VerificationCodeType.FORGOT_PASSWORD)),
      ).rejects.toThrow("Email is not exist.");
      expect(
        mocks.verificationCodeRepository.createVerificationCode,
      ).not.toHaveBeenCalled();
    });

    it("issues a code for password recovery when the user exists", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirst.mockResolvedValue(makeUser());
      mocks.verificationCodeRepository.createVerificationCode.mockResolvedValue(
        makeVerificationCode({ type: VerificationCodeType.FORGOT_PASSWORD }),
      );

      // Act
      await service.sendOTP(makeBody(VerificationCodeType.FORGOT_PASSWORD));

      // Assert
      expect(
        mocks.verificationCodeRepository.createVerificationCode,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@example.com",
          type: VerificationCodeType.FORGOT_PASSWORD,
        }),
      );
    });

    it("issues a code for LOGIN regardless of whether the user was found", async () => {
      // Arrange - neither guard applies to the LOGIN / DISABLE_2FA types
      mocks.sharedUserRepository.findFirst.mockResolvedValue(makeUser());
      mocks.verificationCodeRepository.createVerificationCode.mockResolvedValue(
        makeVerificationCode({ type: VerificationCodeType.LOGIN }),
      );

      // Act
      const result = await service.sendOTP(
        makeBody(VerificationCodeType.LOGIN),
      );

      // Assert
      expect(result.type).toBe(VerificationCodeType.LOGIN);
    });

    it("issues a DISABLE_2FA code even when no user row is returned", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirst.mockResolvedValue(null);
      mocks.verificationCodeRepository.createVerificationCode.mockResolvedValue(
        makeVerificationCode({ type: VerificationCodeType.DISABLE_2FA }),
      );

      // Act
      const result = await service.sendOTP(
        makeBody(VerificationCodeType.DISABLE_2FA),
      );

      // Assert
      expect(result.type).toBe(VerificationCodeType.DISABLE_2FA);
    });
  });

  describe("forgotPassword", () => {
    const body: ForgotPasswordRequestDto = {
      email: "user@example.com",
      password: "newSecurePassword123",
      confirmPassword: "newSecurePassword123",
      code: "123456",
    };

    it("stores the new hashed password and burns the verification code", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirstOrThrow.mockResolvedValue(makeUser());
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(
        makeVerificationCode({ type: VerificationCodeType.FORGOT_PASSWORD }),
      );
      mocks.hashingService.hash.mockReturnValue("new-hashed-password");
      mocks.userRepository.updateUser.mockResolvedValue(makeUser());
      mocks.verificationCodeRepository.deleteVerificationCode.mockResolvedValue(
        { count: 1 },
      );

      // Act
      const result = await service.forgotPassword(body);

      // Assert
      expect(result).toEqual({ message: "Password has been updated." });
      expect(mocks.userRepository.updateUser).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { password: "new-hashed-password", updatedById: USER_ID },
      });
      expect(
        mocks.verificationCodeRepository.deleteVerificationCode,
      ).toHaveBeenCalledWith({ where: { email: body.email } });
    });

    it("rejects an unknown email before validating the code", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirstOrThrow.mockRejectedValue(
        new Error("No User found"),
      );

      // Act & Assert
      await expect(service.forgotPassword(body)).rejects.toThrow(
        "No User found",
      );
      expect(
        mocks.verificationCodeRepository.findUnique,
      ).not.toHaveBeenCalled();
      expect(mocks.userRepository.updateUser).not.toHaveBeenCalled();
    });

    it("rejects an expired verification code and leaves the password intact", async () => {
      // Arrange
      mocks.sharedUserRepository.findFirstOrThrow.mockResolvedValue(makeUser());
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(
        makeVerificationCode({ expiresAt: new Date(NOW.getTime() - 1) }),
      );

      // Act & Assert
      await expect(service.forgotPassword(body)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(mocks.hashingService.hash).not.toHaveBeenCalled();
      expect(mocks.userRepository.updateUser).not.toHaveBeenCalled();
    });
  });
});
