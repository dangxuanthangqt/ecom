import { ArgumentsHost } from "@nestjs/common";
import { Request, Response } from "express";

export interface MockResponse {
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
    // The filter is declared `@Catch()` with no argument, so it checks the host
    // type before touching request/response. The harness must answer that.
    getType: jest.fn<string, []>(() => "http"),
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

/** The `res` double the filter was handed, typed so specs need no unsafe access. */
export const mockResponseOf = (host: ArgumentsHost): MockResponse =>
  host.switchToHttp().getResponse<unknown>() as MockResponse;

/** The envelope every exception filter in this codebase writes via `res.json()`. */
export interface ExceptionResponseBody {
  statusCode: number;
  error: string;
  message: string;
  details: Array<{ field: string; code: string; message: string }>;
  requestId?: string;
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
