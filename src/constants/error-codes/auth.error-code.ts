/**
 * Authentication, registration and two-factor failures.
 *
 * These are the codes a client branches on rather than merely displays: a missing
 * TOTP code opens the two-factor dialog, an unregistered email keeps the user on
 * the form with the field marked. Naming states what is wrong, never what the
 * client should do about it.
 */
export const AuthErrorCode = {
  /** No account for the email supplied. Raised on login and on password reset. */
  EMAIL_NOT_FOUND: "EMAIL_NOT_FOUND",
  /** Registration hit an email that already has an account. */
  EMAIL_ALREADY_REGISTERED: "EMAIL_ALREADY_REGISTERED",
  /** The account exists but the password does not match. */
  PASSWORD_INVALID: "PASSWORD_INVALID",
  /** The emailed OTP does not match any outstanding code. */
  VERIFICATION_CODE_INVALID: "VERIFICATION_CODE_INVALID",
  /** The emailed OTP matched but its window has closed. */
  VERIFICATION_CODE_EXPIRED: "VERIFICATION_CODE_EXPIRED",
  /** The authenticator-app code does not verify against the stored secret. */
  TOTP_CODE_INVALID: "TOTP_CODE_INVALID",
  /** 2FA is on and the request carried neither a TOTP nor an emailed code. */
  TOTP_OR_VERIFICATION_CODE_REQUIRED: "TOTP_OR_VERIFICATION_CODE_REQUIRED",
  /** Setup was attempted on an account that already has 2FA. */
  TWO_FACTOR_ALREADY_ENABLED: "TWO_FACTOR_ALREADY_ENABLED",
  /** Teardown or verification was attempted on an account without 2FA. */
  TWO_FACTOR_NOT_ENABLED: "TWO_FACTOR_NOT_ENABLED",

  /** Bearer token past its expiry. The client refreshes and replays. */
  ACCESS_TOKEN_EXPIRED: "ACCESS_TOKEN_EXPIRED",
  /** Bearer token malformed or signed by something else. Refreshing will not help. */
  ACCESS_TOKEN_INVALID: "ACCESS_TOKEN_INVALID",
  /** The endpoint needs a bearer and the request carried none. */
  ACCESS_TOKEN_REQUIRED: "ACCESS_TOKEN_REQUIRED",
  /** No configured authentication scheme accepted the request. */
  AUTHORIZATION_FAILED: "AUTHORIZATION_FAILED",
  /** Authenticated, but the role lacks the permission the route requires. */
  PERMISSION_DENIED: "PERMISSION_DENIED",
} as const;
