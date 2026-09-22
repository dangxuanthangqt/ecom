import { ExecutionContext, Logger } from "@nestjs/common";
import {
  ThrottlerModuleOptions,
  ThrottlerStorage,
  normalizeIp,
} from "@nestjs/throttler";
import { Request } from "express";

import { GlobalThrottle, ThrottlerName } from "@/constants/throttle.constant";

/** RFC 5321 caps an address at 320 characters; anything longer is not an email. */
const MAX_EMAIL_LENGTH = 320;

/** Providers that also ignore dots in the local part, not just `+` tags. */
const DOT_INSENSITIVE_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Folds the spellings of one mailbox onto a single rate-limit key.
 *
 * `victim@gmail.com`, `victim+1@gmail.com` and `vic.tim@gmail.com` are three
 * strings that reach one inbox. Keyed separately, an attacker gets a fresh OTP
 * budget per spelling and the issuance limit stops bounding anything — the
 * endpoint becomes a mail cannon aimed at a mailbox its caller does not own.
 *
 * This is for rate-limit keys only. It is never used to look up, create or
 * compare an account, so folding two addresses together can cost a caller some
 * budget but can never log anyone into the wrong account. It errs toward
 * over-merging for that reason: stripping a `+` tag on a provider that treats it
 * as significant makes the limit slightly stricter, which is the safe direction.
 */
const canonicalizeEmail = (email: string): string => {
  const separator = email.lastIndexOf("@");

  if (separator <= 0) {
    return email;
  }

  const domain = email.slice(separator + 1);
  let local = email.slice(0, separator);
  const tag = local.indexOf("+");

  // `> 0`, not `>= 0`: an address that is entirely a tag has no base to fold to.
  if (tag > 0) {
    local = local.slice(0, tag);
  }

  if (DOT_INSENSITIVE_DOMAINS.has(domain)) {
    local = local.replaceAll(".", "");
  }

  return `${local}@${domain}`;
};

const logger = new Logger("Throttler");

const requestOf = (context: ExecutionContext): Request =>
  context.switchToHttp().getRequest<Request>();

/**
 * The account a request is about, taken from the request body.
 *
 * Only a string is accepted: `email` arrives unvalidated here because guards run
 * before the validation pipe, so a caller can put an object or an array there.
 * Normalizing to lowercase closes the obvious evasion of alternating case to get
 * a fresh counter for the same mailbox.
 */
export const emailSubjectOf = (request: Request): string | undefined => {
  const body: unknown = request.body;

  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const email = (body as Record<string, unknown>).email;

  if (typeof email !== "string") {
    return undefined;
  }

  const normalized = email.trim().toLowerCase();

  return normalized
    ? canonicalizeEmail(normalized).slice(0, MAX_EMAIL_LENGTH)
    : undefined;
};

/**
 * Builds the three-throttler configuration described in `throttle.constant.ts`.
 *
 * `skipIf` is repeated per throttler rather than set once at the top because the
 * guard treats a throttler's own `skipIf` as a replacement for the shared one,
 * not an addition to it — a single common `skipIf` would be ignored by exactly
 * the two throttlers that need it most.
 */
export const createThrottlerOptions = (
  enabled: boolean,
  storage: ThrottlerStorage,
): ThrottlerModuleOptions => {
  if (!enabled) {
    // Loud on purpose. This is the only defence the API has against credential
    // and OTP guessing, and a silent "off" is indistinguishable from working.
    logger.warn(
      "THROTTLE_ENABLED is false — no rate limiting is in effect. Expected only in tests.",
    );
  }

  const skipUnlessEmail = (context: ExecutionContext): boolean =>
    !enabled || !emailSubjectOf(requestOf(context));

  return {
    storage,
    skipIf: () => !enabled,
    throttlers: [
      {
        name: ThrottlerName.DEFAULT,
        ...GlobalThrottle[ThrottlerName.DEFAULT],
      },
      {
        name: ThrottlerName.CREDENTIAL,
        ...GlobalThrottle[ThrottlerName.CREDENTIAL],
        skipIf: skipUnlessEmail,
        getTracker: (request: Record<string, unknown>) => {
          const typed = request as unknown as Request;

          return `${normalizeIp(typed.ip ?? "")}|${emailSubjectOf(typed) ?? ""}`;
        },
      },
      {
        name: ThrottlerName.ACCOUNT,
        ...GlobalThrottle[ThrottlerName.ACCOUNT],
        skipIf: skipUnlessEmail,
        getTracker: (request: Record<string, unknown>) =>
          emailSubjectOf(request as unknown as Request) ?? "",
      },
    ],
  };
};
