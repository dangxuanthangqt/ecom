import * as bcrypt from "bcrypt";

import { HashingService } from "../hashing.service";

import { setupHashingService } from "./hashing-service-test-harness";

jest.mock("bcrypt");

describe("HashingService", () => {
  let service: HashingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ service } = await setupHashingService());
  });

  describe("hash", () => {
    it("hashes plain text value using bcrypt", () => {
      // Arrange
      const plainText = "securePassword123";
      const hashedValue = "$2b$10$hashedvalue";
      (bcrypt.hashSync as jest.Mock).mockReturnValue(hashedValue);

      // Act
      const result = service.hash(plainText);

      // Assert
      expect(bcrypt.hashSync).toHaveBeenCalledWith(plainText, 10);
      expect(result).toBe(hashedValue);
    });

    it("uses salt rounds of 10", () => {
      // Arrange
      const plainText = "password";
      (bcrypt.hashSync as jest.Mock).mockReturnValue("hashed");

      // Act
      service.hash(plainText);

      // Assert
      expect(bcrypt.hashSync).toHaveBeenCalledWith(plainText, 10);
    });

    it("returns hashed value as string", () => {
      // Arrange
      const plainText = "myPassword";
      const hashedValue =
        "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KfO";
      (bcrypt.hashSync as jest.Mock).mockReturnValue(hashedValue);

      // Act
      const result = service.hash(plainText);

      // Assert
      expect(typeof result).toBe("string");
      expect(result).toBe(hashedValue);
    });

    it("handles empty string input", () => {
      // Arrange
      const plainText = "";
      const hashedValue = "$2b$10$somehash";
      (bcrypt.hashSync as jest.Mock).mockReturnValue(hashedValue);

      // Act
      const result = service.hash(plainText);

      // Assert
      expect(bcrypt.hashSync).toHaveBeenCalledWith("", 10);
      expect(result).toBe(hashedValue);
    });

    it("handles long password", () => {
      // Arrange
      const plainText = "a".repeat(1000);
      const hashedValue = "$2b$10$somehash";
      (bcrypt.hashSync as jest.Mock).mockReturnValue(hashedValue);

      // Act
      const result = service.hash(plainText);

      // Assert
      expect(bcrypt.hashSync).toHaveBeenCalledWith(plainText, 10);
      expect(result).toBe(hashedValue);
    });

    it("handles special characters in password", () => {
      // Arrange
      const plainText = "P@$$w0rd!#%&*()[]{}";
      const hashedValue = "$2b$10$somehash";
      (bcrypt.hashSync as jest.Mock).mockReturnValue(hashedValue);

      // Act
      const _result = service.hash(plainText);

      // Assert
      expect(bcrypt.hashSync).toHaveBeenCalledWith(plainText, 10);
    });

    it("generates different hashes for same input (in real bcrypt)", () => {
      // Arrange
      const plainText = "password";
      const hash1 = "$2b$10$hash1";
      const hash2 = "$2b$10$hash2";
      (bcrypt.hashSync as jest.Mock)
        .mockReturnValueOnce(hash1)
        .mockReturnValueOnce(hash2);

      // Act
      const result1 = service.hash(plainText);
      const result2 = service.hash(plainText);

      // Assert
      expect(result1).not.toBe(result2);
      expect(bcrypt.hashSync).toHaveBeenCalledTimes(2);
    });
  });

  describe("compare", () => {
    it("returns true when password matches hash", () => {
      // Arrange
      const plainText = "securePassword123";
      const hash = "$2b$10$hashedvalue";
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      // Act
      const result = service.compare(plainText, hash);

      // Assert
      expect(bcrypt.compareSync).toHaveBeenCalledWith(plainText, hash);
      expect(result).toBe(true);
    });

    it("returns false when password does not match hash", () => {
      // Arrange
      const plainText = "wrongPassword";
      const hash = "$2b$10$hashedvalue";
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

      // Act
      const result = service.compare(plainText, hash);

      // Assert
      expect(bcrypt.compareSync).toHaveBeenCalledWith(plainText, hash);
      expect(result).toBe(false);
    });

    it("compares password and hash correctly", () => {
      // Arrange
      const plainText = "myPassword";
      const hash =
        "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KfO";
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      // Act
      const result = service.compare(plainText, hash);

      // Assert
      expect(bcrypt.compareSync).toHaveBeenCalledWith(plainText, hash);
      expect(result).toBe(true);
    });

    it("is case-sensitive", () => {
      // Arrange
      const hash = "$2b$10$hashedvalue";
      (bcrypt.compareSync as jest.Mock)
        .mockReturnValueOnce(true) // for "Password"
        .mockReturnValueOnce(false); // for "password"

      // Act
      const result1 = service.compare("Password", hash);
      const result2 = service.compare("password", hash);

      // Assert
      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(bcrypt.compareSync).toHaveBeenCalledTimes(2);
    });

    it("handles empty string password", () => {
      // Arrange
      const plainText = "";
      const hash = "$2b$10$hashedvalue";
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

      // Act
      const result = service.compare(plainText, hash);

      // Assert
      expect(bcrypt.compareSync).toHaveBeenCalledWith("", hash);
      expect(result).toBe(false);
    });

    it("handles special characters in comparison", () => {
      // Arrange
      const plainText = "P@$$w0rd!#%&*()[]{}";
      const hash = "$2b$10$hashedvalue";
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      // Act
      const result = service.compare(plainText, hash);

      // Assert
      expect(bcrypt.compareSync).toHaveBeenCalledWith(plainText, hash);
      expect(result).toBe(true);
    });

    it("handles unicode characters", () => {
      // Arrange
      const plainText = "пароль日本語🔐";
      const hash = "$2b$10$hashedvalue";
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      // Act
      const result = service.compare(plainText, hash);

      // Assert
      expect(bcrypt.compareSync).toHaveBeenCalledWith(plainText, hash);
      expect(result).toBe(true);
    });

    it("returns boolean type", () => {
      // Arrange
      const plainText = "password";
      const hash = "$2b$10$hash";
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      // Act
      const result = service.compare(plainText, hash);

      // Assert
      expect(typeof result).toBe("boolean");
    });

    it("handles very long hash", () => {
      // Arrange
      const plainText = "password";
      const hash = "$2b$10$" + "a".repeat(100);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

      // Act
      const result = service.compare(plainText, hash);

      // Assert
      expect(bcrypt.compareSync).toHaveBeenCalledWith(plainText, hash);
      expect(result).toBe(false);
    });
  });

  describe("integration between hash and compare", () => {
    it("can hash and then verify the same password", () => {
      // Arrange
      const plainText = "mySecurePassword";
      const hashedValue = "$2b$10$hashedvalue";
      (bcrypt.hashSync as jest.Mock).mockReturnValue(hashedValue);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      // Act
      const hash = service.hash(plainText);
      const isMatch = service.compare(plainText, hash);

      // Assert
      expect(isMatch).toBe(true);
      expect(bcrypt.hashSync).toHaveBeenCalledWith(plainText, 10);
      expect(bcrypt.compareSync).toHaveBeenCalledWith(plainText, hashedValue);
    });

    it("fails to verify wrong password against hash", () => {
      // Arrange
      const password = "correctPassword";
      const wrongPassword = "wrongPassword";
      const hashedValue = "$2b$10$hashedvalue";
      (bcrypt.hashSync as jest.Mock).mockReturnValue(hashedValue);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

      // Act
      const hash = service.hash(password);
      const isMatch = service.compare(wrongPassword, hash);

      // Assert
      expect(isMatch).toBe(false);
    });
  });
});
