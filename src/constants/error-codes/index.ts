import { HttpStatus } from "@nestjs/common";

import { AuthErrorCode } from "./auth.error-code";
import { CartErrorCode } from "./cart.error-code";
import { CatalogErrorCode } from "./catalog.error-code";
import { IdentityErrorCode } from "./identity.error-code";
import { InfraErrorCode } from "./infra.error-code";
import { OrderErrorCode } from "./order.error-code";
import { ReviewErrorCode } from "./review.error-code";
import { UploadErrorCode } from "./upload.error-code";

/**
 * Stable, machine-readable error identifiers.
 *
 * Clients branch on these strings, so they are never localized and never renamed
 * without a versioned API change. Only codes the application raises deliberately
 * live here — every other code is derived from the HTTP status by
 * {@link errorCodeFromStatus}, which keeps this list from drifting into a
 * hand-maintained duplicate of `HttpStatus`.
 *
 * One file per domain so no single file grows past the project's size limit; this
 * module is the only entry point, and nothing imports a domain file directly.
 */
export const ErrorCode = {
  ...InfraErrorCode,
  ...AuthErrorCode,
  ...IdentityErrorCode,
  ...CatalogErrorCode,
  ...CartErrorCode,
  ...OrderErrorCode,
  ...ReviewErrorCode,
  ...UploadErrorCode,
} as const;

/**
 * The closed union of codes a caller may raise deliberately.
 *
 * `throwHttpException` is held to this, so a typo or an unregistered code fails
 * at compile time rather than reaching a client that cannot branch on it.
 */
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Deliberately `string`, not a union over `ErrorCode`: codes are also derived at
 * runtime from `HttpStatus`, which no closed union can express. Do not narrow it.
 * The envelope stays open on the reading side; only writers are constrained.
 */
export type ErrorCodeType = string;

/** Answer for a client-side status `HttpStatus` has no name for. */
const FALLBACK_CODE = "REQUEST_FAILED";

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
    : FALLBACK_CODE;
}

/**
 * Every value `error` can hold, published as the Swagger enum so the generated
 * client type is a union rather than a bare `string`.
 *
 * It is the registry plus the status-derived names, because both reach the wire:
 * narrowing it to the registry alone would make the generated type lie.
 */
export const ALL_ERROR_CODES: string[] = Array.from(
  new Set<string>([
    ...Object.values(ErrorCode),
    ...Object.values(HttpStatus).filter(
      (value): value is string => typeof value === "string",
    ),
    FALLBACK_CODE,
  ]),
);
