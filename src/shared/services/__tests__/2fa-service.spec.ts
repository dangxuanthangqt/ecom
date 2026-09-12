import OTPAuth from "otpauth";

import { TwoFactorAuthenticationService } from "../2fa.service";

import { setup2FAService } from "./2fa-service-test-harness";

// Helper to create TOTP instance for testing
const createTOTPInstance = (email: string, secret: string): OTPAuth.TOTP => {
  return new OTPAuth.TOTP({
    issuer: "E-commerce",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
};

describe("TwoFactorAuthenticationService", () => {
  let service: TwoFactorAuthenticationService;

  beforeEach(async () => {
    ({ service } = await setup2FAService());
  });

  describe("generateTOTPSecret", () => {
    it("generates TOTP secret for email", () => {
      // Arrange
      const email = "user@example.com";

      // Act
      const result = service.generateTOTPSecret(email);

      // Assert
      expect(result).toHaveProperty("secret");
      expect(result).toHaveProperty("uri");
      expect(result.secret).toBeTruthy();
      expect(typeof result.secret).toBe("string");
      expect(result.uri).toBeTruthy();
      expect(typeof result.uri).toBe("string");
    });

    it("generates URI with issuer and email label", () => {
      // Arrange
      const email = "user@example.com";

      // Act
      const result = service.generateTOTPSecret(email);

      // Assert
      expect(result.uri).toContain("E-commerce");
      // Email is URL-encoded in URI as user%40example.com
      expect(result.uri).toContain("user%40example.com");
      expect(result.uri).toContain("otpauth://totp");
    });

    it("generates different secrets for different emails", () => {
      // Arrange
      const email1 = "user1@example.com";
      const email2 = "user2@example.com";

      // Act
      const result1 = service.generateTOTPSecret(email1);
      const result2 = service.generateTOTPSecret(email2);

      // Assert
      expect(result1.secret).not.toBe(result2.secret);
    });

    it("uses provided secret when given", () => {
      // Arrange
      const email = "user@example.com";
      const customSecret = "JBSWY3DPEBLW64TMMQ";

      // Act
      const result = service.generateTOTPSecret(email, customSecret);

      // Assert
      expect(result.secret).toBe(customSecret);
      expect(result.uri).toContain(customSecret);
    });

    it("generates valid base32 encoded secret", () => {
      // Arrange
      const email = "user@example.com";

      // Act
      const result = service.generateTOTPSecret(email);

      // Assert
      // Base32 characters are A-Z and 2-7
      expect(/^[A-Z2-7=]+$/.test(result.secret)).toBe(true);
    });

    it("generates different secrets on consecutive calls", () => {
      // Arrange
      const email = "user@example.com";

      // Act
      const result1 = service.generateTOTPSecret(email);
      const result2 = service.generateTOTPSecret(email);

      // Assert
      expect(result1.secret).not.toBe(result2.secret);
    });
  });

  describe("verifyTOTPCode", () => {
    it("verifies valid TOTP code", () => {
      // Arrange
      const email = "user@example.com";
      const { secret } = service.generateTOTPSecret(email);

      // Generate a valid code using the same logic
      const totp = createTOTPInstance(email, secret);
      const validCode = totp.generate();

      // Act
      const isValid = service.verifyTOTPCode({
        email,
        totpCode: validCode,
        secret,
      });

      // Assert
      expect(isValid).toBe(true);
    });

    it("rejects invalid TOTP code", () => {
      // Arrange
      const email = "user@example.com";
      const { secret } = service.generateTOTPSecret(email);
      const invalidCode = "000000";

      // Act
      const isValid = service.verifyTOTPCode({
        email,
        totpCode: invalidCode,
        secret,
      });

      // Assert
      expect(isValid).toBe(false);
    });

    it("validates against provided secret", () => {
      // Arrange
      const email = "user@example.com";
      const secret1 = service.generateTOTPSecret(email).secret;
      const secret2 = service.generateTOTPSecret(email).secret;

      const totp = createTOTPInstance(email, secret1);
      const codeForSecret1 = totp.generate();

      // Act
      const isValidForSecret1 = service.verifyTOTPCode({
        email,
        totpCode: codeForSecret1,
        secret: secret1,
      });

      const isValidForSecret2 = service.verifyTOTPCode({
        email,
        totpCode: codeForSecret1,
        secret: secret2,
      });

      // Assert
      expect(isValidForSecret1).toBe(true);
      expect(isValidForSecret2).toBe(false);
    });

    it("requires exact code match (6 digits)", () => {
      // Arrange
      const email = "user@example.com";
      const { secret } = service.generateTOTPSecret(email);

      const totp = createTOTPInstance(email, secret);
      const validCode = totp.generate();
      const invalidCode = validCode + "1"; // Add extra digit

      // Act
      const isValid = service.verifyTOTPCode({
        email,
        totpCode: invalidCode,
        secret,
      });

      // Assert
      expect(isValid).toBe(false);
    });

    it("accepts codes within time window", () => {
      // Arrange
      const email = "user@example.com";
      const { secret } = service.generateTOTPSecret(email);

      const totp = createTOTPInstance(email, secret);

      // Get current code
      const currentCode = totp.generate();

      // Act
      const isValid = service.verifyTOTPCode({
        email,
        totpCode: currentCode,
        secret,
      });

      // Assert
      expect(isValid).toBe(true);
    });

    it("handles different email addresses independently", () => {
      // Arrange
      const email1 = "user1@example.com";
      const email2 = "user2@example.com";
      const { secret: secret1 } = service.generateTOTPSecret(email1);
      const { secret: secret2 } = service.generateTOTPSecret(email2);

      const totp1 = createTOTPInstance(email1, secret1);
      const code1 = totp1.generate();

      // Act
      const isValidForEmail1 = service.verifyTOTPCode({
        email: email1,
        totpCode: code1,
        secret: secret1,
      });

      const isValidForEmail2 = service.verifyTOTPCode({
        email: email2,
        totpCode: code1,
        secret: secret2,
      });

      // Assert
      expect(isValidForEmail1).toBe(true);
      expect(isValidForEmail2).toBe(false);
    });
  });
});
