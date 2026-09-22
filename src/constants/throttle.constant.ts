/**
 * Rate-limit policy, in one place so a reviewer can read the whole posture
 * without opening a controller.
 *
 * Three throttlers run per request, each answering a different question:
 *
 * - `default`  — "is this source flooding us?"      keyed by IP.
 * - `credential` — "is this source hammering one account?" keyed by IP + email.
 * - `account`  — "is *anyone* hammering this account?"  keyed by email alone.
 *
 * `credential` and `account` only apply to requests that carry an email in the
 * body, which is exactly the set of endpoints a credential- or code-guessing
 * attack has to go through. `account` is the one that survives an attacker
 * rotating IPs, so it is the limit that actually bounds a distributed guess;
 * `credential` is tighter because a single source has no legitimate reason to
 * reach it.
 *
 * Limits count *every* request, not just failed ones — a successful login still
 * consumes budget. They are deliberately in code rather than in env: they are
 * security policy, and a policy that can be widened by an environment variable
 * is a policy that will be widened by accident.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const ThrottlerName = {
  DEFAULT: "default",
  CREDENTIAL: "credential",
  ACCOUNT: "account",
} as const;

export type ThrottlerNameType =
  (typeof ThrottlerName)[keyof typeof ThrottlerName];

export type ThrottleRule = {
  limit: number;
  ttl: number;
  blockDuration: number;
};

/**
 * Applied to every route that does not override them. The `default` numbers are
 * a flood guard, not an authentication control — they are generous enough that
 * ordinary browsing never sees a 429.
 */
export const GlobalThrottle: Record<ThrottlerNameType, ThrottleRule> = {
  [ThrottlerName.DEFAULT]: {
    limit: 120,
    ttl: MINUTE,
    blockDuration: MINUTE,
  },
  [ThrottlerName.CREDENTIAL]: {
    limit: 10,
    ttl: MINUTE,
    blockDuration: 5 * MINUTE,
  },
  [ThrottlerName.ACCOUNT]: {
    limit: 30,
    ttl: HOUR,
    blockDuration: 15 * MINUTE,
  },
};

/**
 * Per-route overrides, passed straight to `@Throttle(...)`.
 *
 * `GUESS_CODE` covers every endpoint that accepts a six-digit code and tells the
 * caller whether it was right: register, forgot-password, and login when 2FA is
 * on. Six digits is a million combinations, so the whole defence rests on how
 * many guesses per hour reach the endpoint — 20/hour per account turns an
 * exhaustive search into millennia even with several codes alive at once.
 *
 * `REQUEST_CODE` covers OTP issuance. It is tight for a second reason beyond
 * brute force: each call sends an email, so an unbounded endpoint is also a
 * free mail cannon pointed at someone else's inbox.
 */
export const AuthThrottle = {
  /** `POST /auth/login` — credential guessing, and code guessing when 2FA is on. */
  LOGIN: {
    [ThrottlerName.CREDENTIAL]: {
      limit: 5,
      ttl: MINUTE,
      blockDuration: 5 * MINUTE,
    },
    [ThrottlerName.ACCOUNT]: {
      limit: 20,
      ttl: HOUR,
      blockDuration: 15 * MINUTE,
    },
  },

  /** `POST /auth/otp` — issuance. Also bounds how many codes can be alive at once. */
  REQUEST_CODE: {
    [ThrottlerName.CREDENTIAL]: {
      limit: 3,
      ttl: MINUTE,
      blockDuration: 5 * MINUTE,
    },
    [ThrottlerName.ACCOUNT]: {
      limit: 10,
      ttl: HOUR,
      blockDuration: 15 * MINUTE,
    },
  },

  /** `POST /auth/register`, `POST /auth/forgot-password` — code verification. */
  GUESS_CODE: {
    [ThrottlerName.CREDENTIAL]: {
      limit: 5,
      ttl: MINUTE,
      blockDuration: 5 * MINUTE,
    },
    [ThrottlerName.ACCOUNT]: {
      limit: 20,
      ttl: HOUR,
      blockDuration: 15 * MINUTE,
    },
  },

  /**
   * `POST /auth/refresh-token`, `POST /auth/logout`, the Google OAuth routes.
   *
   * These carry no email, so `credential` and `account` skip them and only the
   * IP-keyed throttler is left. It is tightened here because a client with a
   * valid session has no reason to call them in a loop.
   */
  SESSION: {
    [ThrottlerName.DEFAULT]: {
      limit: 30,
      ttl: MINUTE,
      blockDuration: MINUTE,
    },
  },

  /**
   * `POST /auth/2fa/*`.
   *
   * `disable` accepts a six-digit code, so it is a guessing surface like the
   * `GUESS_CODE` routes — but the account it is about comes from the bearer
   * token, and this guard runs before the one that reads it. There is no email
   * in the body to key on, so the per-account ceiling those routes get is not
   * available here and only the address-keyed limit remains.
   *
   * KNOWN GAP: an attacker who already holds a valid access token and rotates
   * source addresses is bounded per address, not per account. Closing it needs
   * the caller's identity at throttle time — see phase-02 and phase-04 of
   * `plans/260919-1632-auth-hardening-international-standards`, which move
   * identity earlier. Until then this is deliberately far tighter than SESSION.
   */
  TWO_FACTOR: {
    [ThrottlerName.DEFAULT]: {
      limit: 5,
      ttl: MINUTE,
      blockDuration: 15 * MINUTE,
    },
  },
} as const;
