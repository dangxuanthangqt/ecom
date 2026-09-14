import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";

import { ErrorDetailDto } from "@/dtos/error-detail.dto";
import { ValidateException } from "@/shared/exceptions/validate.exception";

import { GlobalExceptionFilter } from "../global-exception.filter";

import {
  extractResponseCall,
  extractStatusCall,
  makeArgumentsHost,
  mockResponseOf,
} from "./filters-test-harness";

describe("GlobalExceptionFilter", () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it("passes ValidateException through with VALIDATION_FAILED and intact details", () => {
    // Arrange
    const details: ErrorDetailDto[] = [
      {
        field: "code",
        code: "isNotEmpty",
        message: "code should not be empty",
      },
    ];
    const exception = new ValidateException(details);

    const host = makeArgumentsHost();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    expect(response).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      error: "VALIDATION_FAILED",
      message: "Validation failed",
      details: [
        {
          field: "code",
          code: "isNotEmpty",
          message: "code should not be empty",
        },
      ],
    });
  });

  it("maps a plain NotFoundException to NOT_FOUND with string message and empty details", () => {
    // Arrange
    const exception = new NotFoundException("User not found");
    const host = makeArgumentsHost();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
    // Nest stamps its own `error: "Not Found"` onto a string-built exception.
    // The mapper must discard that phrase and derive the machine code, or two
    // 404s in one app would answer with two different `error` values.
    expect(response.error).toBe("NOT_FOUND");
    expect(response.message).toBe("User not found");
    expect(response.details).toEqual([]);
  });

  it("keeps a deliberate SCREAMING_SNAKE error code from the throw site", () => {
    // Arrange
    const exception = new ConflictException({
      error: "CART_ITEMS_UNAVAILABLE",
      message: "Some items are no longer available.",
    });
    const host = makeArgumentsHost();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    expect(response.error).toBe("CART_ITEMS_UNAVAILABLE");
    expect(response.statusCode).toBe(HttpStatus.CONFLICT);
  });

  it("does not write a second response once headers are already sent", () => {
    // Arrange
    const exception = new NotFoundException("User not found");
    const host = makeArgumentsHost({}, { headersSent: true });
    const response = mockResponseOf(host);

    // Act
    filter.catch(exception, host);

    // Assert
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });

  it("coerces an HttpException with string[] message into a joined string with empty details", () => {
    // Arrange
    const exception = new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      message: ["field1 error", "field2 error"],
    });
    const host = makeArgumentsHost();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    expect(response).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: "field1 error; field2 error",
      details: [],
    });
  });

  it("lifts ErrorDetailDto[] from message into details, leaving message a string", () => {
    // Arrange
    const details: ErrorDetailDto[] = [
      {
        field: "email",
        code: "isEmail",
        message: "must be an email",
      },
      {
        field: "password",
        code: "minLength",
        message: "must be at least 8 chars",
      },
    ];
    const exception = new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      message: details,
    });
    const host = makeArgumentsHost();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    expect(response).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: "Validation failed",
      details,
    });
  });

  it("catches a plain Error with 500 and omits the error text from the body", () => {
    // Arrange
    const exception = new Error("boom");
    const host = makeArgumentsHost();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.message).not.toContain("boom");
    expect(response.details).toEqual([]);
  });

  it("includes requestId from req.id when present", () => {
    // Arrange
    const exception = new NotFoundException("Not found");
    const mockRequest = { id: "request-123" } as unknown as Request;
    const host = makeArgumentsHost(mockRequest);

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    expect(response.requestId).toBe("request-123");
  });

  it("omits requestId when not present on request", () => {
    // Arrange
    const exception = new NotFoundException("Not found");
    const host = makeArgumentsHost({});

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    expect(response.requestId).toBeUndefined();
  });

  it("converts requestId to string when it is numeric", () => {
    // Arrange
    const exception = new NotFoundException("Not found");
    const mockRequest = { id: 12345 } as unknown as Request;
    const host = makeArgumentsHost(mockRequest);

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    expect(response.requestId).toBe("12345");
  });

  it("responds with the correct HTTP status via res.status()", () => {
    // Arrange
    const exception = new BadRequestException("Bad input");
    const host = makeArgumentsHost();

    // Act
    filter.catch(exception, host);

    // Assert
    const status = extractStatusCall(host.switchToHttp().getResponse());
    expect(status).toBe(HttpStatus.BAD_REQUEST);
  });

  it("derives error code from HTTP status when not explicitly set", () => {
    // Arrange
    const exception = new BadRequestException("Something went wrong");
    const host = makeArgumentsHost();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    // Error code is derived from HTTP status; it should be truthy and not null
    expect(response.error).toBeTruthy();
    expect(typeof response.error).toBe("string");
  });

  it("preserves explicit error code if present in exception payload", () => {
    // Arrange
    const exception = new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      error: "CUSTOM_ERROR_CODE",
      message: "Custom error",
    });
    const host = makeArgumentsHost();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(host.switchToHttp().getResponse());
    expect(response.error).toBe("CUSTOM_ERROR_CODE");
  });
});
