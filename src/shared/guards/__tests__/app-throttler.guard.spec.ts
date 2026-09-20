import { ExecutionContext, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from "@nestjs/throttler";
import { Response } from "express";

import { AppThrottlerGuard } from "../app-throttler.guard";

/**
 * The method under test is `protected`; the suite calls it as the base class
 * does. It throws synchronously despite its `Promise<void>` signature — the base
 * guard awaits it from inside an async method, so either form reaches Nest as a
 * rejected promise.
 */
type ExposedGuard = {
  throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void>;
};

/** Runs the guard's throw and hands back whatever it raised. */
const raisedBy = (
  guard: ExposedGuard,
  context: ExecutionContext,
  detail: ThrottlerLimitDetail,
): unknown => {
  try {
    void guard.throwThrottlingException(context, detail);
  } catch (error) {
    return error;
  }

  throw new Error("Expected the guard to reject the request");
};

const makeResponse = (headersSent = false) => ({
  headersSent,
  header: jest.fn(),
});

const makeContext = (response: ReturnType<typeof makeResponse>) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => response as unknown as Response,
    }),
  }) as unknown as ExecutionContext;

const makeDetail = (
  overrides: Partial<ThrottlerLimitDetail> = {},
): ThrottlerLimitDetail =>
  ({
    limit: 5,
    ttl: 60_000,
    key: "hashed-key",
    tracker: "203.0.113.7|victim@example.com",
    totalHits: 6,
    timeToExpire: 40,
    isBlocked: true,
    timeToBlockExpire: 300,
    ...overrides,
  }) as ThrottlerLimitDetail;

describe("AppThrottlerGuard - throwThrottlingException", () => {
  const buildGuard = (): ExposedGuard =>
    new AppThrottlerGuard(
      { throttlers: [] } as ThrottlerModuleOptions,
      { increment: jest.fn() } as unknown as ThrottlerStorage,
      new Reflector(),
    ) as unknown as ExposedGuard;

  it("answers 429 in the shared error envelope", () => {
    // Arrange
    const guard = buildGuard();
    const context = makeContext(makeResponse());

    // Act
    const raised = raisedBy(guard, context, makeDetail());

    // Assert
    expect(raised).toMatchObject({
      response: {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "Too many requests. Please try again later.",
        details: [],
      },
    });
  });

  it("sets Retry-After under its standard name", () => {
    // Arrange — the base guard would emit `Retry-After-credential`, which no
    // client reads
    const guard = buildGuard();
    const response = makeResponse();

    // Act
    raisedBy(
      guard,
      makeContext(response),
      makeDetail({ timeToBlockExpire: 300 }),
    );

    // Assert
    expect(response.header).toHaveBeenCalledWith("Retry-After", "300");
  });

  it("leaves the response alone once headers are on the wire", () => {
    // Arrange
    const guard = buildGuard();
    const response = makeResponse(true);

    // Act
    raisedBy(guard, makeContext(response), makeDetail());

    // Assert
    expect(response.header).not.toHaveBeenCalled();
  });

  it("tells the caller nothing about which limit tripped or what is left", () => {
    // Arrange
    const guard = buildGuard();

    // Act
    const raised = raisedBy(
      guard,
      makeContext(makeResponse()),
      makeDetail({ tracker: "203.0.113.7|victim@example.com" }),
    ) as { response: { message: string } };

    // Assert — the tracker holds an email, and the counts would help tune an attack
    expect(raised.response.message).not.toContain("victim@example.com");
    expect(JSON.stringify(raised.response)).not.toContain("credential");
    expect(JSON.stringify(raised.response)).not.toContain("6");
  });
});
