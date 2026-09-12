import { HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaClientExceptionFilter } from "../prisma-exception.filter";

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

// Type for the mock HTTP context
type MockHttpContext = {
  getRequest: jest.Mock<unknown>;
  getResponse: jest.Mock<MockResponse, []>;
};

describe("PrismaClientExceptionFilter - catch", () => {
  let filter: PrismaClientExceptionFilter<any>;

  beforeEach(() => {
    filter = new PrismaClientExceptionFilter();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps P1008 error code to 408 REQUEST_TIMEOUT", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Request timeout", {
      code: "P1008",
      clientVersion: "5.0.0",
    });
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.REQUEST_TIMEOUT);
    expect(extractResponseCall(mockResponse)).toMatchObject({
      statusCode: HttpStatus.REQUEST_TIMEOUT,
      message: "Request timeout.",
    });
  });

  it("maps P2000 error code to 400 BAD_REQUEST", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "Input Data is too long.",
      {
        code: "P2000",
        clientVersion: "5.0.0",
      },
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.BAD_REQUEST);
    expect(extractResponseCall(mockResponse)).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: "Input Data is too long.",
    });
  });

  it("maps P2001 error code to 204 NO_CONTENT", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "Record does not exist.",
      {
        code: "P2001",
        clientVersion: "5.0.0",
      },
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.NO_CONTENT);
    expect(extractResponseCall(mockResponse)).toMatchObject({
      statusCode: HttpStatus.NO_CONTENT,
      message: "Record does not exist.",
    });
  });

  it("maps P2002 error code to 409 CONFLICT", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "Reference Data already exists.",
      {
        code: "P2002",
        clientVersion: "5.0.0",
      },
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.CONFLICT);
    expect(extractResponseCall(mockResponse)).toMatchObject({
      statusCode: HttpStatus.CONFLICT,
      message: "Reference Data already exists.",
    });
  });

  it("maps P2003 error code to 422 UNPROCESSABLE_ENTITY", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "The provided input can not be processed.",
      {
        code: "P2003",
        clientVersion: "5.0.0",
      },
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(extractResponseCall(mockResponse)).toMatchObject({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: "The provided input can not be processed.",
    });
  });

  it("maps P2014 error code to 422 UNPROCESSABLE_ENTITY", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "The provided input can not be processed.",
      {
        code: "P2014",
        clientVersion: "5.0.0",
      },
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it("maps P2016 error code to 404 NOT_FOUND", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "The entity to update does not exist.",
      {
        code: "P2016",
        clientVersion: "5.0.0",
      },
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.NOT_FOUND);
    expect(extractResponseCall(mockResponse)).toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      message: "The entity to update does not exist.",
    });
  });

  it("maps P2020 error code to 422 UNPROCESSABLE_ENTITY", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "The provided input can not be processed.",
      {
        code: "P2020",
        clientVersion: "5.0.0",
      },
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it("maps P2021 error code to 500 INTERNAL_SERVER_ERROR", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "Internal server error.",
      {
        code: "P2021",
        clientVersion: "5.0.0",
      },
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it("maps P2025 error code to 404 NOT_FOUND", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "The queried entity does not exist.",
      {
        code: "P2025",
        clientVersion: "5.0.0",
      },
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.NOT_FOUND);
    expect(extractResponseCall(mockResponse)).toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      message: "The queried entity does not exist.",
    });
  });

  it("maps unknown error code to 500 INTERNAL_SERVER_ERROR", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Unknown error", {
      code: "P9999",
      clientVersion: "5.0.0",
    });
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(extractResponseCall(mockResponse)).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        "Sorry! Something went to wrong on our end, Please try again later.",
    });
  });

  it("handles exception without code property by returning 500", () => {
    // Arrange
    const error = new Prisma.PrismaClientValidationError(
      "Validation error occurred",
      { clientVersion: "5.0.0" } as any,
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it("extracts the actual error message from Prisma error format", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "Error line1 → Error message line2\nActual error here\nMore detail",
      {
        code: "P2002",
        clientVersion: "5.0.0",
      },
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(HttpStatus.CONFLICT);
    const response = extractResponseCall(mockResponse);
    expect(response).toHaveProperty("message");
  });

  it("catches PrismaClientInitializationError", () => {
    // Arrange
    const error = new Prisma.PrismaClientInitializationError(
      "Initialization error",
      "5.0.0",
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it("catches PrismaClientRustPanicError", () => {
    // Arrange
    const error = new Prisma.PrismaClientRustPanicError(
      "Rust panic occurred",
      "5.0.0",
    );
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    expect(extractStatusCall(mockResponse)).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it("returns JSON response with statusCode and message properties", () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Test error", {
      code: "P2001",
      clientVersion: "5.0.0",
    });
    const host = makeArgumentsHost();
    const httpHost = host.switchToHttp() as unknown as MockHttpContext;
    const mockResponse = httpHost.getResponse();

    // Act
    filter.catch(error, host);

    // Assert
    const response = extractResponseCall(mockResponse);
    expect(response).toHaveProperty("statusCode");
    expect(response).toHaveProperty("message");
    expect(Object.keys(response).length).toBe(2);
  });
});
