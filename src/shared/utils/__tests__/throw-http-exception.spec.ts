import {
  BadRequestException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";

import { ErrorCode } from "@/constants/error-codes";

import throwHttpException from "../throw-http-exception.util";

describe("throwHttpException", () => {
  /**
   * The exception body, read through the public `getResponse()` rather than the
   * private `response` field, and typed so assertions need no unsafe access.
   */
  interface ErrorDetailDto {
    field: string;
    code: string;
    message: string;
  }

  interface ExceptionBody {
    statusCode: number;
    error?: string;
    message: string;
    details: ErrorDetailDto[];
  }

  const bodyOf = (error: unknown): ExceptionBody =>
    (error as HttpException).getResponse() as ExceptionBody;

  /** Reads one entry from the details array. */
  const detailAt = (error: unknown, index: number): ErrorDetailDto =>
    bodyOf(error).details[index];

  /** The `type` argument, so the default-branch test can pass an invalid one. */
  type HttpErrorType = Parameters<typeof throwHttpException>[0]["type"];

  describe("badRequest", () => {
    it("throws BadRequestException with message", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "badRequest",
          message: "Invalid input",
        });

      // Act & Assert
      expect(action).toThrow(BadRequestException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const body = bodyOf(error);
        expect(body.message).toBe("Invalid input");
        expect(body.details).toEqual([]);
      }
    });

    it("throws BadRequestException with message and field", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "badRequest",
          message: "Invalid email",
          field: "email",
        });

      // Act & Assert
      expect(action).toThrow(BadRequestException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const body = bodyOf(error);
        expect(body.message).toBe("Invalid email");
        expect(body.details).toHaveLength(1);
        expect(body.details[0]).toMatchObject({
          field: "email",
          message: "Invalid email",
          code: "invalid",
        });
      }
    });
  });

  describe("notFound", () => {
    it("throws NotFoundException with message", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "notFound",
          message: "User not found",
        });

      // Act & Assert
      expect(action).toThrow(NotFoundException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        const body = bodyOf(error);
        expect(body.message).toBe("User not found");
        expect(body.details).toEqual([]);
      }
    });

    it("throws NotFoundException with message and field", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "notFound",
          message: "Product not found",
          field: "productId",
        });

      // Act & Assert
      expect(action).toThrow(NotFoundException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        const body = bodyOf(error);
        expect(body.message).toBe("Product not found");
        expect(body.details).toHaveLength(1);
        expect(body.details[0]).toMatchObject({
          field: "productId",
          message: "Product not found",
          code: "invalid",
        });
      }
    });
  });

  describe("unprocessable", () => {
    it("throws UnprocessableEntityException with message", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "unprocessable",
          message: "Cannot process request",
        });

      // Act & Assert
      expect(action).toThrow(UnprocessableEntityException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(UnprocessableEntityException);
        const body = bodyOf(error);
        expect(body.message).toBe("Cannot process request");
        expect(body.details).toEqual([]);
      }
    });

    it("throws UnprocessableEntityException with message and field", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "unprocessable",
          message: "Email already exists",
          field: "email",
        });

      // Act & Assert
      expect(action).toThrow(UnprocessableEntityException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(UnprocessableEntityException);
        const body = bodyOf(error);
        expect(body.message).toBe("Email already exists");
        expect(body.details).toHaveLength(1);
        expect(body.details[0]).toMatchObject({
          field: "email",
          message: "Email already exists",
          code: "invalid",
        });
      }
    });
  });

  describe("unauthorized", () => {
    it("throws UnauthorizedException with message", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "unauthorized",
          message: "Invalid credentials",
        });

      // Act & Assert
      expect(action).toThrow(UnauthorizedException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const body = bodyOf(error);
        expect(body.message).toBe("Invalid credentials");
        expect(body.details).toEqual([]);
      }
    });

    it("throws UnauthorizedException with message and field", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "unauthorized",
          message: "Token expired",
          field: "token",
        });

      // Act & Assert
      expect(action).toThrow(UnauthorizedException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const body = bodyOf(error);
        expect(body.message).toBe("Token expired");
        expect(body.details).toHaveLength(1);
        expect(body.details[0]).toMatchObject({
          field: "token",
          message: "Token expired",
          code: "invalid",
        });
      }
    });
  });

  describe("forbidden", () => {
    it("throws ForbiddenException with message", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "forbidden",
          message: "Access denied",
        });

      // Act & Assert
      expect(action).toThrow(ForbiddenException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const body = bodyOf(error);
        expect(body.message).toBe("Access denied");
        expect(body.details).toEqual([]);
      }
    });

    it("throws ForbiddenException with message and field", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "forbidden",
          message: "Cannot delete admin user",
          field: "userId",
        });

      // Act & Assert
      expect(action).toThrow(ForbiddenException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const body = bodyOf(error);
        expect(body.message).toBe("Cannot delete admin user");
        expect(body.details).toHaveLength(1);
        expect(body.details[0]).toMatchObject({
          field: "userId",
          message: "Cannot delete admin user",
          code: "invalid",
        });
      }
    });
  });

  describe("conflict", () => {
    it("throws ConflictException with message", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "conflict",
          message: "Resource already exists",
        });

      // Act & Assert
      expect(action).toThrow(ConflictException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        const body = bodyOf(error);
        expect(body.message).toBe("Resource already exists");
        expect(body.details).toEqual([]);
      }
    });

    it("throws ConflictException with message and field", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "conflict",
          message: "You have already reviewed this product",
          field: "productId",
        });

      // Act & Assert
      expect(action).toThrow(ConflictException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        const body = bodyOf(error);
        expect(body.message).toBe("You have already reviewed this product");
        expect(body.details).toHaveLength(1);
        expect(body.details[0]).toMatchObject({
          field: "productId",
          message: "You have already reviewed this product",
          code: "invalid",
        });
      }
    });
  });

  describe("internal", () => {
    it("throws InternalServerErrorException with message", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "internal",
          message: "Something went wrong",
        });

      // Act & Assert
      expect(action).toThrow(InternalServerErrorException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        const body = bodyOf(error);
        expect(body.message).toBe("Something went wrong");
        expect(body.details).toEqual([]);
      }
    });

    it("throws InternalServerErrorException with message and field", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "internal",
          message: "Database connection failed",
          field: "database",
        });

      // Act & Assert
      expect(action).toThrow(InternalServerErrorException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        const body = bodyOf(error);
        expect(body.message).toBe("Database connection failed");
        expect(body.details).toHaveLength(1);
        expect(body.details[0]).toMatchObject({
          field: "database",
          message: "Database connection failed",
          code: "invalid",
        });
      }
    });
  });

  describe("default case (internal)", () => {
    it("defaults to HttpException for invalid type", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          // Deliberately invalid, to exercise the switch default.
          type: "invalid" as unknown as HttpErrorType,
          message: "Default error",
        });

      // Act & Assert
      expect(action).toThrow(HttpException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const body = bodyOf(error);
        expect(body.message).toBe("Default error");
        expect(body.details).toEqual([]);
      }
    });
  });

  describe("error response structure", () => {
    it("includes field in details when provided", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "badRequest",
          message: "Test message",
          field: "testField",
        });

      // Act & Assert
      try {
        action();
      } catch (error) {
        const detail = detailAt(error, 0);
        expect(detail.field).toBe("testField");
        expect(detail.message).toBe("Test message");
      }
    });

    it("includes empty details when field is not provided", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "badRequest",
          message: "Test message",
        });

      // Act & Assert
      try {
        action();
      } catch (error) {
        const body = bodyOf(error);
        expect(body.message).toBe("Test message");
        expect(body.details).toEqual([]);
      }
    });

    it("includes only message when field is not provided for notFound", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "notFound",
          message: "Test message",
        });

      // Act & Assert
      try {
        action();
      } catch (error) {
        const body = bodyOf(error);
        expect(body.message).toBe("Test message");
        expect(body.details).toEqual([]);
      }
    });

    it("preserves message text exactly", () => {
      // Arrange
      const messageText =
        "This is a very specific error message with special chars: !@#$%";
      const action = () =>
        throwHttpException({
          type: "badRequest",
          message: messageText,
        });

      // Act & Assert
      try {
        action();
      } catch (error) {
        const body = bodyOf(error);
        expect(body.message).toBe(messageText);
      }
    });

    it("uses custom detail code when provided", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "badRequest",
          message: "Email validation failed",
          field: "email",
          detailCode: "isEmail",
        });

      // Act & Assert
      try {
        action();
      } catch (error) {
        const detail = detailAt(error, 0);
        expect(detail.code).toBe("isEmail");
      }
    });

    it("uses default code when not provided", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "badRequest",
          message: "Invalid input",
          field: "someField",
        });

      // Act & Assert
      try {
        action();
      } catch (error) {
        const detail = detailAt(error, 0);
        expect(detail.code).toBe("invalid");
      }
    });

    it("includes statusCode and error fields in response", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "badRequest",
          message: "Test",
          code: ErrorCode.VALIDATION_FAILED,
        });

      // Act & Assert
      try {
        action();
      } catch (error) {
        const body = bodyOf(error);
        expect(body.statusCode).toBe(400);
        expect(body.error).toBe(ErrorCode.VALIDATION_FAILED);
      }
    });

    it("puts the rule code on both the envelope and the detail entry", () => {
      // A client branches on `error`, a form marks the input from `details`, and
      // both have to name the same rule or the two disagree on screen.
      const action = () =>
        throwHttpException({
          type: "badRequest",
          code: ErrorCode.EMAIL_NOT_FOUND,
          message: "Email is not found.",
          field: "email",
        });

      try {
        action();
      } catch (error) {
        expect(bodyOf(error).error).toBe(ErrorCode.EMAIL_NOT_FOUND);
        expect(detailAt(error, 0).code).toBe(ErrorCode.EMAIL_NOT_FOUND);
      }
    });

    it("leaves the envelope code to the status when no rule code is given", () => {
      // Infrastructure failures stay uncoded on purpose: a client cannot branch on
      // them, and naming them would grow the registry without buying anything.
      const action = () =>
        throwHttpException({
          type: "internal",
          message: "Failed to reach S3.",
        });

      try {
        action();
      } catch (error) {
        expect(bodyOf(error).error).toBeUndefined();
      }
    });
  });

  describe("never return", () => {
    it("is marked as never return type", () => {
      // This test ensures the function signature is correct
      // The function should always throw and never return

      const action = () =>
        throwHttpException({
          type: "badRequest",
          message: "test",
        });

      expect(action).toThrow();
    });
  });
});
