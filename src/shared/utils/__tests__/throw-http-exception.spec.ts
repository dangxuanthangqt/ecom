import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";

import throwHttpException from "../throw-http-exception.util";

describe("throwHttpException", () => {
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
        expect(error.response.message).toEqual([{ message: "Invalid input" }]);
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
        expect(error.response.message).toEqual([
          { message: "Invalid email", field: "email" },
        ]);
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
        expect(error.response).toEqual({ message: "User not found" });
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
        expect(error.response).toEqual({
          message: "Product not found",
          field: "productId",
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
        expect(error.response).toEqual({ message: "Cannot process request" });
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
        expect(error.response).toEqual({
          message: "Email already exists",
          field: "email",
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
        expect(error.response).toEqual({ message: "Invalid credentials" });
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
        expect(error.response).toEqual({
          message: "Token expired",
          field: "token",
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
        expect(error.response).toEqual({ message: "Access denied" });
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
        expect(error.response).toEqual({
          message: "Cannot delete admin user",
          field: "userId",
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
        expect(error.response).toEqual({ message: "Something went wrong" });
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
        expect(error.response).toEqual({
          message: "Database connection failed",
          field: "database",
        });
      }
    });
  });

  describe("default case (internal)", () => {
    it("defaults to internal error for invalid type", () => {
      // Arrange
      const action = () =>
        throwHttpException({
          type: "invalid" as any,
          message: "Default error",
        });

      // Act & Assert
      expect(action).toThrow(InternalServerErrorException);
      try {
        action();
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect(error.response).toEqual({ message: "Default error" });
      }
    });
  });

  describe("error response structure", () => {
    it("includes both message and field in response when provided for badRequest", () => {
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
        expect(error.response.message[0]).toEqual({
          message: "Test message",
          field: "testField",
        });
      }
    });

    it("includes only message in response when field is not provided for badRequest", () => {
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
        expect(error.response.message[0]).toEqual({ message: "Test message" });
      }
    });

    it("includes only message in response when field is not provided for notFound", () => {
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
        expect(error.response).toEqual({ message: "Test message" });
        expect(error.response.field).toBeUndefined();
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
        expect(error.response.message[0].message).toBe(messageText);
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
