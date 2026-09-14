import { HttpException } from "@nestjs/common";

import { errorCodeFromStatus } from "@/constants/error-code.constant";
import { ErrorDetailDto } from "@/dtos/error-detail.dto";
import { ErrorResponseDto } from "@/dtos/error-response.dto";

/**
 * Nest fills `error` with a human phrase of its own ("Not Found", "Bad Request")
 * whenever an exception is built from a bare string, so a truthy `error` is NOT
 * evidence that a machine code was intended. Only SCREAMING_SNAKE survives;
 * anything else is discarded and re-derived from the status, or two 404s in the
 * same app would answer with two different codes.
 */
const isMachineCode = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Z][A-Z0-9_]*$/.test(value);

const isErrorDetail = (value: unknown): value is ErrorDetailDto =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as ErrorDetailDto).field === "string" &&
  typeof (value as ErrorDetailDto).message === "string";

/** A detail entry from elsewhere may omit `code`; the contract says it is a string. */
const withCode = (detail: ErrorDetailDto): ErrorDetailDto => ({
  field: detail.field,
  code: typeof detail.code === "string" ? detail.code : "invalid",
  message: detail.message,
});

/**
 * Normalizes any `HttpException` into the envelope.
 *
 * Three payload shapes reach here:
 * - a plain string, from `new NotFoundException("...")`;
 * - our own envelope, from `ValidateException`, which passes through intact;
 * - Nest's or a library's `{ message: string | string[], error, statusCode }`.
 *
 * The last case is why `message` is coerced: Nest's built-in validation pipe puts
 * an array there, and an array is exactly what this contract exists to eliminate.
 */
export function mapHttpException(exception: HttpException): ErrorResponseDto {
  const statusCode = exception.getStatus();
  const payload = exception.getResponse();

  if (typeof payload === "string") {
    return new ErrorResponseDto({ statusCode, message: payload });
  }

  const record = payload as Record<string, unknown>;
  const { message, details } = normalizeMessage(record.message);

  return new ErrorResponseDto({
    statusCode,
    error: isMachineCode(record.error)
      ? record.error
      : errorCodeFromStatus(statusCode),
    message: message ?? exception.message,
    details: Array.isArray(record.details)
      ? record.details.filter(isErrorDetail).map(withCode)
      : details,
  });
}

function normalizeMessage(raw: unknown): {
  message?: string;
  details?: ErrorDetailDto[];
} {
  if (typeof raw === "string") {
    return { message: raw };
  }

  if (!Array.isArray(raw)) {
    return {};
  }

  // A foreign validation pipe handed us per-field failures under `message`.
  // Lift them into `details` so `message` can stay a string.
  const details = raw.filter(isErrorDetail).map(withCode);

  if (details.length) {
    return { message: "Validation failed", details };
  }

  const texts = raw.filter((item): item is string => typeof item === "string");

  return texts.length ? { message: texts.join("; ") } : {};
}
