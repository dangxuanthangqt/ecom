import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import {
  isPrismaClientKnownRequestError,
  isUniqueConstraintPrismaError,
  isRecordToUpdateOrDeleteNotFoundPrismaError,
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
} from "../prisma-error";

describe("Prisma Error Type Guards", () => {
  describe("isPrismaClientKnownRequestError", () => {
    it("returns true for a PrismaClientKnownRequestError instance", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError("Test error", {
        code: "P2002",
        clientVersion: "0.0.0",
      });

      // Act
      const result = isPrismaClientKnownRequestError(error);

      // Assert
      expect(result).toBe(true);
    });

    it("returns false for a plain Error", () => {
      // Arrange
      const error = new Error("Plain error");

      // Act
      const result = isPrismaClientKnownRequestError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for null", () => {
      // Arrange
      const error = null;

      // Act
      const result = isPrismaClientKnownRequestError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for undefined", () => {
      // Arrange
      const error = undefined;

      // Act
      const result = isPrismaClientKnownRequestError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for a string", () => {
      // Arrange
      const error = "error string";

      // Act
      const result = isPrismaClientKnownRequestError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for a plain object", () => {
      // Arrange
      const error = { code: "P2002", message: "error" };

      // Act
      const result = isPrismaClientKnownRequestError(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isUniqueConstraintPrismaError", () => {
    it("returns true for a P2002 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "0.0.0",
        },
      );

      // Act
      const result = isUniqueConstraintPrismaError(error);

      // Assert
      expect(result).toBe(true);
    });

    it("returns false for a P2025 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "0.0.0",
      });

      // Act
      const result = isUniqueConstraintPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for a P2003 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Foreign key constraint",
        {
          code: "P2003",
          clientVersion: "0.0.0",
        },
      );

      // Act
      const result = isUniqueConstraintPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for a plain Error", () => {
      // Arrange
      const error = new Error("Plain error");

      // Act
      const result = isUniqueConstraintPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for null", () => {
      // Arrange
      const error = null;

      // Act
      const result = isUniqueConstraintPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isRecordToUpdateOrDeleteNotFoundPrismaError", () => {
    it("returns true for a P2025 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "0.0.0",
      });

      // Act
      const result = isRecordToUpdateOrDeleteNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(true);
    });

    it("returns false for a P2002 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "0.0.0",
        },
      );

      // Act
      const result = isRecordToUpdateOrDeleteNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for a P2003 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Foreign key constraint",
        {
          code: "P2003",
          clientVersion: "0.0.0",
        },
      );

      // Act
      const result = isRecordToUpdateOrDeleteNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for a plain Error", () => {
      // Arrange
      const error = new Error("Plain error");

      // Act
      const result = isRecordToUpdateOrDeleteNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for null", () => {
      // Arrange
      const error = null;

      // Act
      const result = isRecordToUpdateOrDeleteNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isForeignKeyConstraintPrismaError", () => {
    it("returns true for a P2003 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Foreign key constraint",
        {
          code: "P2003",
          clientVersion: "0.0.0",
        },
      );

      // Act
      const result = isForeignKeyConstraintPrismaError(error);

      // Assert
      expect(result).toBe(true);
    });

    it("returns false for a P2002 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "0.0.0",
        },
      );

      // Act
      const result = isForeignKeyConstraintPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for a P2025 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "0.0.0",
      });

      // Act
      const result = isForeignKeyConstraintPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for a plain Error", () => {
      // Arrange
      const error = new Error("Plain error");

      // Act
      const result = isForeignKeyConstraintPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for null", () => {
      // Arrange
      const error = null;

      // Act
      const result = isForeignKeyConstraintPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isRecordNotFoundPrismaError", () => {
    it("returns true for a P2025 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "0.0.0",
      });

      // Act
      const result = isRecordNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(true);
    });

    it("returns false for a P2002 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "0.0.0",
        },
      );

      // Act
      const result = isRecordNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for a P2003 error", () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Foreign key constraint",
        {
          code: "P2003",
          clientVersion: "0.0.0",
        },
      );

      // Act
      const result = isRecordNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for a plain Error", () => {
      // Arrange
      const error = new Error("Plain error");

      // Act
      const result = isRecordNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for null", () => {
      // Arrange
      const error = null;

      // Act
      const result = isRecordNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for undefined", () => {
      // Arrange
      const error = undefined;

      // Act
      const result = isRecordNotFoundPrismaError(error);

      // Assert
      expect(result).toBe(false);
    });
  });
});
