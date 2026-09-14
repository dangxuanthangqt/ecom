import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

import { ErrorResponseDto } from "@/dtos/error-response.dto";

import { mapHttpException } from "./http-exception.mapper";
import {
  isPrismaError,
  mapPrismaError,
  shortPrismaMessage,
} from "./prisma-error.mapper";

/**
 * The only writer of error responses in this application.
 *
 * It catches everything (`@Catch()` with no argument) on purpose. Splitting the
 * work across several filters makes the response shape depend on `APP_FILTER`
 * registration order, which is invisible at the call site and easy to break; one
 * filter dispatching to pure mappers cannot drift that way.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // `@Catch()` with no argument also catches non-HTTP contexts, where there is
    // no request or response to speak of. The app is HTTP-only today; this keeps
    // the day someone adds a gateway from turning into a throw inside the filter.
    if (host.getType() !== "http") {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );

      return;
    }

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const body = this.toEnvelope(exception);
    body.requestId = requestIdOf(request);

    this.log(exception, body, request);

    // A partial write is already on the wire; a second one throws out of the only
    // filter there is, and nothing downstream would catch it.
    if (response.headersSent) {
      return;
    }

    response.status(body.statusCode).json(body);
  }

  private toEnvelope(exception: unknown): ErrorResponseDto {
    if (exception instanceof HttpException) {
      return mapHttpException(exception);
    }

    if (isPrismaError(exception)) {
      return mapPrismaError(exception);
    }

    // Nothing recognized it. Answer with the envelope and nothing else — the
    // cause belongs in the log, never in the body.
    return new ErrorResponseDto({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }

  private log(
    exception: unknown,
    body: ErrorResponseDto,
    request: Request,
  ): void {
    const cause = isPrismaError(exception)
      ? shortPrismaMessage(exception.message)
      : exception instanceof Error
        ? exception.message
        : String(exception);

    const line = [
      `[${body.requestId ?? "*"}]`,
      `${request.method} ${request.url}`,
      `-> ${body.statusCode} ${body.error}`,
      `- ${cause}`,
    ].join(" ");

    // A 4xx is the client being told it is wrong — expected traffic, not an
    // incident, so it stays out of the error stream and carries no stack.
    if (body.statusCode < HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.warn(line);

      return;
    }

    this.logger.error(
      line,
      exception instanceof Error ? exception.stack : undefined,
    );
  }
}

/** `pino-http`'s `genReqId` puts the id on `req.id` and echoes it as `X-Request-Id`. */
function requestIdOf(request: Request): string | undefined {
  const id = (request as Request & { id?: unknown }).id;

  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : undefined;
}
