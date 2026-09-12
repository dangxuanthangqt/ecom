import { UnprocessableEntityException } from "@nestjs/common";

import { VerificationCodeType } from "@/constants/verification-code.constant";

import { AuthService } from "../auth.service";

import {
  AuthServiceMocks,
  makeUser,
  makeVerificationCode,
  setupAuthService,
  USER_ID,
} from "./auth-service-test-harness";

describe("AuthService - two-factor authentication", () => {
  let service: AuthService;
  let mocks: AuthServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupAuthService());
  });

  describe("setupTwoFactorAuthentication", () => {
    it("generates a secret, stores it and returns the provisioning URI", async () => {
      // Arrange
      mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue(
        makeUser(),
      );
      mocks.twoFactorAuthenticationService.generateTOTPSecret.mockReturnValue({
        secret: "NEW-SECRET",
        uri: "otpauth://totp/E-commerce:user@example.com",
      });
      mocks.userRepository.updateUser.mockResolvedValue(makeUser());

      // Act
      const result = await service.setupTwoFactorAuthentication(USER_ID);

      // Assert
      expect(result).toEqual({
        secret: "NEW-SECRET",
        uri: "otpauth://totp/E-commerce:user@example.com",
      });
      expect(
        mocks.twoFactorAuthenticationService.generateTOTPSecret,
      ).toHaveBeenCalledWith("user@example.com");
      expect(mocks.userRepository.updateUser).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { totpSecret: "NEW-SECRET", updatedById: USER_ID },
      });
    });

    it("rejects when 2FA is already enabled", async () => {
      // Arrange
      mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue(
        makeUser({ totpSecret: "EXISTING-SECRET" }),
      );

      // Act & Assert
      await expect(
        service.setupTwoFactorAuthentication(USER_ID),
      ).rejects.toThrow("2FA is already enabled.");
      expect(
        mocks.twoFactorAuthenticationService.generateTOTPSecret,
      ).not.toHaveBeenCalled();
      expect(mocks.userRepository.updateUser).not.toHaveBeenCalled();
    });

    it("propagates a missing-user failure from the repository", async () => {
      // Arrange
      mocks.sharedUserRepository.findUniqueOrThrow.mockRejectedValue(
        new Error("No User found"),
      );

      // Act & Assert
      await expect(
        service.setupTwoFactorAuthentication(USER_ID),
      ).rejects.toThrow("No User found");
    });
  });

  describe("disableTwoFactorAuthentication", () => {
    const enabledUser = () => makeUser({ totpSecret: "EXISTING-SECRET" });

    const expectSecretCleared = () =>
      expect(mocks.userRepository.updateUser).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { totpSecret: null, updatedById: USER_ID },
      });

    it("clears the secret when the totpCode is valid", async () => {
      // Arrange
      mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue(
        enabledUser(),
      );
      mocks.twoFactorAuthenticationService.verifyTOTPCode.mockReturnValue(true);
      mocks.userRepository.updateUser.mockResolvedValue(makeUser());

      // Act
      const result = await service.disableTwoFactorAuthentication({
        userId: USER_ID,
        totpCode: "123456",
      });

      // Assert
      expect(result).toEqual({ message: "2FA has been disabled." });
      expect(
        mocks.twoFactorAuthenticationService.verifyTOTPCode,
      ).toHaveBeenCalledWith({
        email: "user@example.com",
        secret: "EXISTING-SECRET",
        totpCode: "123456",
      });
      expectSecretCleared();
    });

    it("rejects an invalid totpCode and keeps the secret", async () => {
      // Arrange
      mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue(
        enabledUser(),
      );
      mocks.twoFactorAuthenticationService.verifyTOTPCode.mockReturnValue(
        false,
      );

      // Act & Assert
      await expect(
        service.disableTwoFactorAuthentication({
          userId: USER_ID,
          totpCode: "000000",
        }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.userRepository.updateUser).not.toHaveBeenCalled();
    });

    it("accepts a DISABLE_2FA verification code when no totpCode is given", async () => {
      // Arrange
      mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue(
        enabledUser(),
      );
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(
        makeVerificationCode({ type: VerificationCodeType.DISABLE_2FA }),
      );
      mocks.userRepository.updateUser.mockResolvedValue(makeUser());

      // Act
      const result = await service.disableTwoFactorAuthentication({
        userId: USER_ID,
        code: "123456",
      });

      // Assert
      expect(result).toEqual({ message: "2FA has been disabled." });
      expect(mocks.verificationCodeRepository.findUnique).toHaveBeenCalledWith({
        where: {
          email_code_type: {
            email: "user@example.com",
            code: "123456",
            type: VerificationCodeType.DISABLE_2FA,
          },
        },
      });
      expectSecretCleared();
    });

    it("rejects an invalid DISABLE_2FA verification code", async () => {
      // Arrange
      mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue(
        enabledUser(),
      );
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.disableTwoFactorAuthentication({
          userId: USER_ID,
          code: "999999",
        }),
      ).rejects.toThrow("Verification code is not valid.");
      expect(mocks.userRepository.updateUser).not.toHaveBeenCalled();
    });

    it("still disables 2FA when neither a totpCode nor a code is supplied", async () => {
      // Arrange - documents the current unguarded branch: no proof is demanded
      mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue(
        enabledUser(),
      );
      mocks.userRepository.updateUser.mockResolvedValue(makeUser());

      // Act
      const result = await service.disableTwoFactorAuthentication({
        userId: USER_ID,
      });

      // Assert
      expect(result).toEqual({ message: "2FA has been disabled." });
      expect(
        mocks.twoFactorAuthenticationService.verifyTOTPCode,
      ).not.toHaveBeenCalled();
      expect(
        mocks.verificationCodeRepository.findUnique,
      ).not.toHaveBeenCalled();
      expectSecretCleared();
    });

    it("rejects when 2FA is not enabled", async () => {
      // Arrange
      mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue(
        makeUser({ totpSecret: null }),
      );

      // Act & Assert
      await expect(
        service.disableTwoFactorAuthentication({
          userId: USER_ID,
          totpCode: "123456",
        }),
      ).rejects.toThrow("2FA is not enabled.");
      expect(mocks.userRepository.updateUser).not.toHaveBeenCalled();
    });
  });
});
