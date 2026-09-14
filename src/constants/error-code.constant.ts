import { HttpStatus } from "@nestjs/common";

/**
 * Stable, machine-readable error identifiers.
 *
 * Clients branch on these strings, so they are never localized and never renamed
 * without a versioned API change. Only codes the application raises deliberately
 * live here — every other code is derived from the HTTP status by
 * {@link errorCodeFromStatus}, which keeps this list from drifting into a
 * hand-maintained duplicate of `HttpStatus`.
 */
export const ErrorCode = {
  /** Request body failed DTO validation. Carries per-field `details`. */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** Anything that escaped every mapper. Never carries internal detail. */
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

/**
 * Deliberately `string`, not a union over `ErrorCode`: codes are also derived at
 * runtime from `HttpStatus`, which no closed union can express. Do not narrow it.
 */
export type ErrorCodeType = string;

/**
 * Derives the machine code from an HTTP status: 400 -> `"BAD_REQUEST"`,
 * 422 -> `"UNPROCESSABLE_ENTITY"`. `HttpStatus` is a numeric enum, so its reverse
 * mapping already holds the canonical SCREAMING_SNAKE name for every status Nest
 * knows — reusing it beats maintaining a second table that can fall behind.
 */
export function errorCodeFromStatus(status: number): ErrorCodeType {
  const name = (HttpStatus as unknown as Record<number, string | undefined>)[
    status
  ];

  if (name) {
    return name;
  }

  return status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)
    ? ErrorCode.INTERNAL_SERVER_ERROR
    : "REQUEST_FAILED";
}
