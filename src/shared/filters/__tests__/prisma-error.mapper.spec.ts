import { HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { mapPrismaError, HTTP_CODE_FROM_PRISMA } from "../prisma-error.mapper";

describe("mapPrismaError", () => {
  it("maps P2000 to 400 BAD_REQUEST", () => {
    // Arrange
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Value too long",
      {
        code: "P2000",
        clientVersion: "6.4.1",
      },
    );

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(result.message).toBe("Input data is too long.");
    expect(result.details).toEqual([]);
  });

  it("maps P2001 to 404 NOT_FOUND (regression fix: was 204)", () => {
    // Arrange
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Record does not exist",
      {
        code: "P2001",
        clientVersion: "6.4.1",
      },
    );

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(result.message).toBe("Record does not exist.");
    expect(result.details).toEqual([]);
  });

  it("maps P2002 to 409 CONFLICT for unique constraint violation", () => {
    // Arrange
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.4.1",
      },
    );

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(result.statusCode).toBe(HttpStatus.CONFLICT);
    expect(result.message).toBe("Reference data already exists.");
  });

  it("maps P2003 to 422 UNPROCESSABLE_ENTITY for foreign key violation", () => {
    // Arrange
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint failed",
      {
        code: "P2003",
        clientVersion: "6.4.1",
      },
    );

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(result.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it("maps P2016 to 404 NOT_FOUND for record-to-update not found", () => {
    // Arrange
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Record to update not found",
      {
        code: "P2016",
        clientVersion: "6.4.1",
      },
    );

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(result.message).toBe("The entity to update does not exist.");
  });

  it("maps P2025 to 404 NOT_FOUND for queried entity not found", () => {
    // Arrange
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Queried entity not found",
      {
        code: "P2025",
        clientVersion: "6.4.1",
      },
    );

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(result.message).toBe("The queried entity does not exist.");
  });

  it("returns 500 with generic message for unknown Prisma error code", () => {
    // Arrange
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Unknown error",
      {
        code: "P9999",
        clientVersion: "6.4.1",
      },
    );

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(result.message).toBe(
      "Sorry! Something went wrong on our end, please try again later.",
    );
    expect(result.details).toEqual([]);
  });

  it("handles PrismaClientValidationError", () => {
    // Arrange
    const exception = new Prisma.PrismaClientValidationError(
      "Validation error",
      {
        clientVersion: "6.4.1",
      },
    );

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(result.message).toBe(
      "Sorry! Something went wrong on our end, please try again later.",
    );
  });

  it("never leaks Prisma's internal error text to the response body", () => {
    // Arrange
    const exception = new Prisma.PrismaClientKnownRequestError(
      `Invalid \`prisma.user.findUniqueOrThrow()\` invocation in /app/src/service.ts:42
      \n→ Unable to reach database server at \`postgresql://user:password@db:5432/ecom\`
      \n→ Connection refused (os error: Connection refused)`,
      {
        code: "P2003",
        clientVersion: "6.4.1",
      },
    );

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(result.message).not.toContain("postgresql");
    expect(result.message).not.toContain("user:password");
    expect(result.message).not.toContain("/app/src/service.ts");
  });

  it("has P1008 mapped to REQUEST_TIMEOUT", () => {
    // Arrange
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Operation timed out",
      {
        code: "P1008",
        clientVersion: "6.4.1",
      },
    );

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(result.statusCode).toBe(HttpStatus.REQUEST_TIMEOUT);
    expect(result.message).toBe("Request timeout.");
  });

  it("always returns details as an empty array", () => {
    // Arrange
    const exception = new Prisma.PrismaClientKnownRequestError("Any error", {
      code: "P2001",
      clientVersion: "6.4.1",
    });

    // Act
    const result = mapPrismaError(exception);

    // Assert
    expect(Array.isArray(result.details)).toBe(true);
    expect(result.details).toHaveLength(0);
  });

  it("validates HTTP_CODE_FROM_PRISMA table completeness", () => {
    // Arrange
    const codes = [
      "P1008",
      "P2000",
      "P2001",
      "P2002",
      "P2003",
      "P2014",
      "P2016",
      "P2020",
      "P2021",
      "P2025",
    ];

    // Assert
    for (const code of codes) {
      expect(HTTP_CODE_FROM_PRISMA[code]).toBeDefined();
      expect(HTTP_CODE_FROM_PRISMA[code].status).toBeGreaterThanOrEqual(100);
      expect(HTTP_CODE_FROM_PRISMA[code].status).toBeLessThan(600);
      expect(HTTP_CODE_FROM_PRISMA[code].message).toBeTruthy();
    }
  });
});
