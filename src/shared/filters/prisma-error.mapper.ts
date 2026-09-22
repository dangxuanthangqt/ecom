import { HttpStatus } from "@nestjs/common";

import { ErrorResponseDto } from "@/dtos/error-response.dto";
import { Prisma } from "@/generated/prisma/client";

/**
 * Prisma error code -> the status and public message the client sees. Prisma's own
 * message text is never forwarded: it names tables, columns and constraints.
 */
export const HTTP_CODE_FROM_PRISMA: Record<
  string,
  { status: HttpStatus; message: string }
> = {
  // Operation timed out.
  P1008: { status: HttpStatus.REQUEST_TIMEOUT, message: "Request timeout." },
  // Value longer than the column allows.
  P2000: { status: HttpStatus.BAD_REQUEST, message: "Input data is too long." },
  // The searched record does not exist. 404, not 204 — the client asked for a
  // resource and must be able to tell "absent" from "present but empty".
  P2001: { status: HttpStatus.NOT_FOUND, message: "Record does not exist." },
  // Unique constraint violation.
  P2002: {
    status: HttpStatus.CONFLICT,
    message: "Reference data already exists.",
  },
  // Foreign key / required-relation violation.
  P2003: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message: "The provided input can not be processed.",
  },
  P2014: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message: "The provided input can not be processed.",
  },
  // Record to update was not found.
  P2016: {
    status: HttpStatus.NOT_FOUND,
    message: "The entity to update does not exist.",
  },
  // Value out of range for the column.
  P2020: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message: "The provided input can not be processed.",
  },
  // Table missing — an infrastructure/migration fault, not bad client input, so
  // it is deliberately a 500 rather than a 4xx.
  P2021: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: "Sorry! Something went wrong on our end, please try again later.",
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: "The queried entity does not exist.",
  },
};

export type PrismaError =
  | Prisma.PrismaClientInitializationError
  | Prisma.PrismaClientValidationError
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientRustPanicError;

export function isPrismaError(exception: unknown): exception is PrismaError {
  return (
    exception instanceof Prisma.PrismaClientInitializationError ||
    exception instanceof Prisma.PrismaClientValidationError ||
    exception instanceof Prisma.PrismaClientKnownRequestError ||
    exception instanceof Prisma.PrismaClientUnknownRequestError ||
    exception instanceof Prisma.PrismaClientRustPanicError
  );
}

export function mapPrismaError(exception: PrismaError): ErrorResponseDto {
  const code = "code" in exception ? exception.code : undefined;
  const mapped = code ? HTTP_CODE_FROM_PRISMA[code] : undefined;

  if (!mapped) {
    // No message of our own: `ErrorResponseDto` supplies the one generic 500 text,
    // so an unmapped Prisma code is indistinguishable from any other 500.
    return new ErrorResponseDto({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }

  return new ErrorResponseDto({
    statusCode: mapped.status,
    message: mapped.message,
  });
}

/**
 * Trims Prisma's multi-line diagnostic down to the line that actually names the
 * fault, for the log only.
 */
export function shortPrismaMessage(message: string): string {
  const fromArrow = message.substring(message.indexOf("→"));

  return fromArrow.substring(fromArrow.indexOf("\n")).replace(/\n/g, "").trim();
}
