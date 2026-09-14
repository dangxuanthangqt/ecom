import { HttpStatus } from "@nestjs/common";

/**
 * Human-facing fallback text, used only when an exception carries no message of
 * its own. Anything user-visible and specific belongs on the exception itself.
 */
export const ErrorMessage: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: "Bad request.",
  [HttpStatus.UNAUTHORIZED]: "Unauthorized.",
  [HttpStatus.FORBIDDEN]: "Forbidden.",
  [HttpStatus.NOT_FOUND]: "Not found.",
  [HttpStatus.REQUEST_TIMEOUT]: "Request timeout.",
  [HttpStatus.CONFLICT]: "Conflict.",
  [HttpStatus.PAYLOAD_TOO_LARGE]: "Payload too large.",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "Unprocessable content.",
  [HttpStatus.TOO_MANY_REQUESTS]: "Too many requests.",
  [HttpStatus.INTERNAL_SERVER_ERROR]:
    "Sorry! Something went wrong on our end, please try again later.",
  [HttpStatus.SERVICE_UNAVAILABLE]: "Service unavailable.",
};

export function defaultMessageForStatus(status: HttpStatus): string {
  return ErrorMessage[status] ?? "An error occurred.";
}
