import { ArgumentsHost } from "@nestjs/common";
import { Request, Response } from "express";

interface MockResponse {
  status: jest.Mock<MockResponse, [number]>;
  json: jest.Mock<MockResponse, [unknown]>;
}

export const makeArgumentsHost = (
  request: Partial<Request> = {},
  response: Partial<Response> = {},
): ArgumentsHost => {
  const mockResponse: MockResponse = {
    status: jest.fn<MockResponse, [number]>().mockReturnThis(),
    json: jest.fn<MockResponse, [unknown]>().mockReturnThis(),
    ...response,
  } as unknown as MockResponse;

  const mockRequest = {
    ...request,
  } as unknown as Request;

  return {
    switchToHttp: jest
      .fn<
        {
          getRequest: jest.Mock<Request, []>;
          getResponse: jest.Mock<MockResponse, []>;
        },
        []
      >()
      .mockReturnValue({
        getRequest: jest.fn<Request, []>(() => mockRequest),
        getResponse: jest.fn<MockResponse, []>(() => mockResponse),
      }),
  } as unknown as ArgumentsHost;
};

/** The envelope every exception filter in this codebase writes via `res.json()`. */
export interface ExceptionResponseBody {
  statusCode: number;
  message: unknown;
}

/**
 * The payload handed to `res.json()`. Typed as the exception envelope so specs
 * can assert `response.statusCode` / `response.message` without unsafe access.
 */
export const extractResponseCall = (
  mockResponse: MockResponse,
): ExceptionResponseBody => {
  const [call] = mockResponse.json.mock.calls;

  if (!call) {
    // A filter that never answered is a failure worth surfacing loudly, rather
    // than a null every caller would have to narrow away before asserting.
    throw new Error("res.json() was never called by the filter under test.");
  }

  return call[0] as ExceptionResponseBody;
};

export const extractStatusCall = (mockResponse: MockResponse) => {
  if (!mockResponse.status.mock.calls.length) {
    return null;
  }
  return mockResponse.status.mock.calls[0]?.[0] ?? null;
};
