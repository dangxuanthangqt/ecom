/**
 * Codes the framework raises about itself, not codes a business rule chooses.
 *
 * Clients cannot act on these beyond showing a generic apology, so the list stays
 * short on purpose: every failure whose only sensible handling is "try again" is
 * left to {@link errorCodeFromStatus} rather than named here.
 */
export const InfraErrorCode = {
  /** Request body failed DTO validation. Carries per-field `details`. */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** Anything that escaped every mapper. Never carries internal detail. */
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  /** Throttled. `Retry-After` on the response says when to come back. */
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  /**
   * A write named a row that does not exist, surfaced from a foreign-key
   * violation. Deliberately vague: the constraint knows which column broke, but
   * saying so would leak the schema, and no client can repair it beyond
   * re-reading the form's options.
   */
  REFERENCE_INVALID: "REFERENCE_INVALID",
} as const;
