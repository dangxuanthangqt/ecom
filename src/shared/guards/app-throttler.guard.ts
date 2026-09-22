import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerLimitDetail } from "@nestjs/throttler";
import { Response } from "express";

import { ErrorCode } from "@/constants/error-codes";

import throwHttpException from "../utils/throw-http-exception.util";

/**
 * Makes a throttled request answer with the API's error envelope instead of the
 * package's own `ThrottlerException`, whose body ("ThrottlerException: Too Many
 * Requests") is neither the shape nor the wording every other error uses. See
 * `docs/error-handling.md`.
 *
 * It also re-emits `Retry-After` under its standard name. The base guard suffixes
 * the header with the throttler that tripped — `Retry-After-credential` — which
 * no client library looks for, so the one header that tells a caller when to come
 * back would otherwise be invisible.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  /**
   * Not `async` despite the base class's signature: `throwHttpException` returns
   * `never`, so there is nothing to await and nothing after it.
   */
  protected throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<Response>();

    if (!response.headersSent) {
      response.header(
        "Retry-After",
        String(throttlerLimitDetail.timeToBlockExpire),
      );
    }

    throwHttpException({
      type: "tooManyRequests",
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      // Deliberately says nothing about which limit was hit or how much budget
      // is left: that is a free oracle for tuning an attack.
      message: "Too many requests. Please try again later.",
    });
  }
}
