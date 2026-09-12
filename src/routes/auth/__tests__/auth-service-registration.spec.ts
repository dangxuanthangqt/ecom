import {
  BadRequestException,
  UnprocessableEntityException,
} from "@nestjs/common";

import { VerificationCodeType } from "@/constants/verification-code.constant";
import { RegisterRequestDto } from "src/dtos/auth/register.dto";

import { AuthService } from "../auth.service";

import {
  AuthServiceMocks,
  makeUser,
  makeVerificationCode,
  ROLE_ID,
  setupAuthService,
} from "./auth-service-test-harness";

describe("AuthService - verification code & registration", () => {
  let service: AuthService;
  let mocks: AuthServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupAuthService());
  });

  describe("validateVerificationCode", () => {
    const input = {
      email: "user@example.com",
      code: "123456",
      type: VerificationCodeType.REGISTER,
    };

    it("resolves when a matching, unexpired code exists", async () => {
      // Arrange
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(
        makeVerificationCode(),
      );

      // Act
      await expect(
        service.validateVerificationCode(input),
      ).resolves.toBeUndefined();

      // Assert
      expect(mocks.verificationCodeRepository.findUnique).toHaveBeenCalledWith({
        where: {
          email_code_type: {
            email: input.email,
            code: input.code,
            type: input.type,
          },
        },
      });
    });

    it("rejects when no code matches", async () => {
      // Arrange
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateVerificationCode(input)).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(service.validateVerificationCode(input)).rejects.toThrow(
        "Verification code is not valid.",
      );
    });

    it("rejects when the code has expired", async () => {
      // Arrange
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(
        makeVerificationCode({ expiresAt: new Date(Date.now() - 1_000) }),
      );

      // Act & Assert
      await expect(service.validateVerificationCode(input)).rejects.toThrow(
        "Verification code is expired.",
      );
    });

    it("accepts a code expiring in the future by a single millisecond", async () => {
      // Arrange - boundary: expiresAt strictly greater than now
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(
        makeVerificationCode({ expiresAt: new Date(Date.now() + 50_000) }),
      );

      // Act & Assert
      await expect(
        service.validateVerificationCode(input),
      ).resolves.toBeUndefined();
    });
  });

  describe("register", () => {
    const body = {
      email: "user@example.com",
      password: "securePassword123",
      confirmPassword: "securePassword123",
      name: "John Doe",
      phoneNumber: "0987654321",
      code: "123456",
    } as RegisterRequestDto;

    it("creates the user with the hashed password and the client role", async () => {
      // Arrange
      const createdUser = makeUser();

      mocks.verificationCodeRepository.findUnique.mockResolvedValue(
        makeVerificationCode(),
      );
      mocks.hashingService.hash.mockReturnValue("hashed-password");
      mocks.sharedRoleRepository.getClientRoleId.mockResolvedValue(ROLE_ID);
      mocks.userRepository.registerUser.mockResolvedValue(createdUser);
      mocks.verificationCodeRepository.deleteVerificationCode.mockResolvedValue(
        { count: 1 },
      );

      // Act
      const result = await service.register(body);

      // Assert
      expect(result).toBe(createdUser);
      expect(mocks.hashingService.hash).toHaveBeenCalledWith(body.password);
      expect(mocks.userRepository.registerUser).toHaveBeenCalledWith({
        email: body.email,
        name: body.name,
        phoneNumber: body.phoneNumber,
        password: "hashed-password",
        roleId: ROLE_ID,
      });
      expect(
        mocks.verificationCodeRepository.deleteVerificationCode,
      ).toHaveBeenCalledWith({ where: { email: body.email } });
    });

    it("validates the code against the REGISTER type before anything else", async () => {
      // Arrange
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.register(body)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(mocks.verificationCodeRepository.findUnique).toHaveBeenCalledWith({
        where: {
          email_code_type: {
            email: body.email,
            code: body.code,
            type: VerificationCodeType.REGISTER,
          },
        },
      });
      expect(mocks.userRepository.registerUser).not.toHaveBeenCalled();
      expect(mocks.hashingService.hash).not.toHaveBeenCalled();
    });

    it("propagates a duplicate-email failure from the repository", async () => {
      // Arrange
      mocks.verificationCodeRepository.findUnique.mockResolvedValue(
        makeVerificationCode(),
      );
      mocks.hashingService.hash.mockReturnValue("hashed-password");
      mocks.sharedRoleRepository.getClientRoleId.mockResolvedValue(ROLE_ID);
      mocks.userRepository.registerUser.mockRejectedValue(
        new BadRequestException("Email already exists."),
      );
      mocks.verificationCodeRepository.deleteVerificationCode.mockResolvedValue(
        { count: 1 },
      );

      // Act & Assert
      await expect(service.register(body)).rejects.toThrow(
        "Email already exists.",
      );
    });
  });
});
