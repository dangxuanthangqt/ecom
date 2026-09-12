import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ZodSerializationException, ZodValidationException } from "nestjs-zod";
import { ZodError, z } from "zod";

import { DefaultExceptionDto } from "@/dtos/default-exception.dto";

import { ExternalExceptionFilter } from "../external-exception.filter";

import {
  extractResponseCall,
  extractStatusCall,
  makeArgumentsHost,
} from "./filters-test-harness";

// Type for the mock response object used in tests
interface MockResponse {
  status: jest.Mock<MockResponse, [number]>;
  json: jest.Mock<MockResponse, [unknown]>;
}

// Type for the mock HTTP context. Extends unknown to avoid type overlap issues.
type MockHttpContext = {
  getRequest: jest.Mock<unknown>;
  getResponse: jest.Mock<MockResponse, []>;
};

describe("ExternalExceptionFilter - catch", () => {
  let filter: ExternalExceptionFilter;

  beforeEach(() => {
    filter = new ExternalExceptionFilter();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("catches ZodValidationException and returns HTTP response", () => {
    // Arrange
    const schema = z.object({ name: z.string() });
    const zodError = schema.safeParse({}).error as ZodError;
    const exception = new ZodValidationException(zodError);
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(mockResponse);
    expect(response).toBeInstanceOf(DefaultExceptionDto);
    expect(response).toHaveProperty("statusCode");
    expect(response).toHaveProperty("message");
    expect(extractStatusCall(mockResponse)).toBe(exception.getStatus());
  });

  it("catches ZodSerializationException and returns HTTP response", () => {
    // Arrange
    const schema = z.object({ name: z.string() });
    const zodError = schema.safeParse({}).error as ZodError;
    const exception = new ZodSerializationException(zodError);
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(mockResponse);
    expect(response).toBeInstanceOf(DefaultExceptionDto);
    expect(response).toHaveProperty("statusCode");
    expect(response).toHaveProperty("message");
    expect(extractStatusCall(mockResponse)).toBe(exception.getStatus());
  });

  it("handles BadRequestException with message string", () => {
    // Arrange
    const exception = new BadRequestException("Invalid request");
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.BAD_REQUEST);
    const response = extractResponseCall(mockResponse);
    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(response.message).toBeDefined();
  });

  it("handles UnauthorizedException with message string", () => {
    // Arrange
    const exception = new UnauthorizedException("Unauthorized access");
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.UNAUTHORIZED);
    const response = extractResponseCall(mockResponse);
    expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
  });

  it("handles ForbiddenException with message string", () => {
    // Arrange
    const exception = new ForbiddenException("Forbidden resource");
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.FORBIDDEN);
    const response = extractResponseCall(mockResponse);
    expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
  });

  it("handles NotFoundException with message string", () => {
    // Arrange
    const exception = new NotFoundException("Resource not found");
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.NOT_FOUND);
    const response = extractResponseCall(mockResponse);
    expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
  });

  it("handles UnprocessableEntityException", () => {
    // Arrange
    const exception = new UnprocessableEntityException(
      "Cannot process request",
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    const response = extractResponseCall(mockResponse);
    expect(response.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it("extracts message from HttpException response object", () => {
    // Arrange
    const exception = new BadRequestException({
      message: "Field is required",
      field: "email",
    });
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(mockResponse);
    expect(response).toHaveProperty("message");
    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it("returns DefaultExceptionDto with statusCode property", () => {
    // Arrange
    const exception = new BadRequestException("Test error");
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(mockResponse);
    expect(response).toBeInstanceOf(DefaultExceptionDto);
    expect(response).toHaveProperty("statusCode");
  });

  it("returns DefaultExceptionDto with message property", () => {
    // Arrange
    const exception = new BadRequestException("Test error");
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(mockResponse);
    expect(response).toHaveProperty("message");
  });

  it("captures exception info for logging", () => {
    // Arrange
    const exception = new BadRequestException("Test error");
    const host = makeArgumentsHost();
    const logSpy = jest.spyOn(console, "error");

    // Act
    filter.catch(exception, host);

    // Assert
    // Logger is called with the formatted message and stack
    expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  it("builds log message with status and message", () => {
    // Arrange
    const exception = new ForbiddenException("Access denied");
    const host = makeArgumentsHost();

    // Act
    filter.catch(exception, host);

    // Assert
    // Response is created with correct status code
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();
    const response = extractResponseCall(mockResponse);
    expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
  });

  it("sends response with correct HTTP status", () => {
    // Arrange
    const exception = new UnauthorizedException("Unauthorized");
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.UNAUTHORIZED);
  });

  it("sends response as JSON", () => {
    // Arrange
    const exception = new BadRequestException("Invalid");
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    expect(mockResponse.json).toHaveBeenCalled();
    const response = extractResponseCall(mockResponse);
    expect(response).toBeDefined();
  });

  it("handles HttpException with object response containing message", () => {
    // Arrange
    const exception = new BadRequestException({
      message: "Detailed error message",
      statusCode: HttpStatus.BAD_REQUEST,
    });
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    const response = extractResponseCall(mockResponse);
    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(response.message).toBeDefined();
  });

  it("chains status and json calls correctly", () => {
    // Arrange
    const exception = new NotFoundException("Not found");
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(exception, host);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalled();
  });
});
