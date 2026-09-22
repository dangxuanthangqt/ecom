import { ExecutionContext } from "@nestjs/common";
import { ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";
import { Request } from "express";

import { GlobalThrottle, ThrottlerName } from "@/constants/throttle.constant";

import {
  createThrottlerOptions,
  emailSubjectOf,
} from "../throttler-options.factory";

const storage = {
  increment: jest.fn(),
} as unknown as ThrottlerStorage;

const makeRequest = (overrides: Partial<Request> = {}): Request =>
  ({ ip: "203.0.113.7", body: {}, ...overrides }) as Request;

const makeContext = (request: Request): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

/** The options object form, which is what the factory always returns. */
const throttlersOf = (options: ThrottlerModuleOptions) =>
  (options as Exclude<ThrottlerModuleOptions, unknown[]>).throttlers;

const throttlerNamed = (options: ThrottlerModuleOptions, name: string) => {
  const found = throttlersOf(options).find(
    (throttler) => throttler.name === name,
  );

  if (!found) {
    throw new Error(`No throttler named ${name}`);
  }

  return found;
};

describe("emailSubjectOf", () => {
  it("returns the email lowercased and trimmed", () => {
    // Arrange
    const request = makeRequest({ body: { email: "  User@Example.COM " } });

    // Act & Assert
    expect(emailSubjectOf(request)).toBe("user@example.com");
  });

  it("treats differently-cased spellings of one mailbox as the same subject", () => {
    // Arrange
    const lower = makeRequest({ body: { email: "victim@example.com" } });
    const mixed = makeRequest({ body: { email: "ViCtIm@Example.com" } });

    // Act & Assert — otherwise an attacker gets a fresh budget per spelling
    expect(emailSubjectOf(lower)).toBe(emailSubjectOf(mixed));
  });

  it("folds a plus-tagged address onto the mailbox it reaches", () => {
    // Arrange — otherwise every tag buys a fresh OTP budget for one inbox
    const plain = makeRequest({ body: { email: "victim@example.com" } });
    const tagged = makeRequest({
      body: { email: "victim+signup@example.com" },
    });

    // Act & Assert
    expect(emailSubjectOf(tagged)).toBe("victim@example.com");
    expect(emailSubjectOf(tagged)).toBe(emailSubjectOf(plain));
  });

  it("folds dotted Gmail spellings, which also reach one inbox", () => {
    // Arrange
    const plain = makeRequest({ body: { email: "victim@gmail.com" } });
    const dotted = makeRequest({ body: { email: "v.i.c.t.i.m@gmail.com" } });

    // Act & Assert
    expect(emailSubjectOf(dotted)).toBe(emailSubjectOf(plain));
  });

  it("leaves dots alone on providers where they are significant", () => {
    // Arrange — folding these would merge two genuinely different mailboxes
    const first = makeRequest({ body: { email: "first.last@example.com" } });
    const second = makeRequest({ body: { email: "firstlast@example.com" } });

    // Act & Assert
    expect(emailSubjectOf(first)).not.toBe(emailSubjectOf(second));
  });

  it("keeps an address that is nothing but a tag", () => {
    // Arrange — no base mailbox to fold onto
    const request = makeRequest({ body: { email: "+tag@example.com" } });

    // Act & Assert
    expect(emailSubjectOf(request)).toBe("+tag@example.com");
  });

  it("leaves a malformed address untouched rather than mangling the key", () => {
    // Arrange
    const request = makeRequest({ body: { email: "not-an-email" } });

    // Act & Assert
    expect(emailSubjectOf(request)).toBe("not-an-email");
  });

  it("returns undefined when the body carries no email", () => {
    expect(emailSubjectOf(makeRequest({ body: {} }))).toBeUndefined();
  });

  it("returns undefined when the body is absent", () => {
    expect(
      emailSubjectOf(makeRequest({ body: undefined as unknown as object })),
    ).toBeUndefined();
  });

  it("ignores a non-string email, which reaches the guard unvalidated", () => {
    // Arrange — guards run before the validation pipe, so this really can arrive
    const injected = makeRequest({ body: { email: { $ne: null } } });
    const arrayed = makeRequest({ body: { email: ["a@b.com"] } });

    // Act & Assert
    expect(emailSubjectOf(injected)).toBeUndefined();
    expect(emailSubjectOf(arrayed)).toBeUndefined();
  });

  it("returns undefined for a whitespace-only email", () => {
    expect(emailSubjectOf(makeRequest({ body: { email: "   " } }))).toBe(
      undefined,
    );
  });

  it("caps an oversized email so one caller cannot bloat the key space", () => {
    // Arrange
    const request = makeRequest({ body: { email: "a".repeat(5000) } });

    // Act
    const subject = emailSubjectOf(request);

    // Assert
    expect(subject).toHaveLength(320);
  });
});

describe("createThrottlerOptions", () => {
  it("registers the three throttlers with their policy limits", () => {
    // Act
    const options = createThrottlerOptions(true, storage);

    // Assert
    expect(throttlersOf(options).map((throttler) => throttler.name)).toEqual([
      ThrottlerName.DEFAULT,
      ThrottlerName.CREDENTIAL,
      ThrottlerName.ACCOUNT,
    ]);
    expect(throttlerNamed(options, ThrottlerName.CREDENTIAL).limit).toBe(
      GlobalThrottle[ThrottlerName.CREDENTIAL].limit,
    );
  });

  it("passes the Redis storage through, so limits are shared across instances", () => {
    // Act
    const options = createThrottlerOptions(true, storage);

    // Assert
    expect(
      (options as Exclude<ThrottlerModuleOptions, unknown[]>).storage,
    ).toBe(storage);
  });

  describe("when enabled", () => {
    const options = createThrottlerOptions(true, storage);

    it("keys the credential throttler by address and account together", () => {
      // Arrange
      const throttler = throttlerNamed(options, ThrottlerName.CREDENTIAL);
      const request = makeRequest({ body: { email: "victim@example.com" } });

      // Act
      const tracker = throttler.getTracker?.(
        request as unknown as Record<string, unknown>,
        makeContext(request),
      );

      // Assert
      expect(tracker).toBe("203.0.113.7|victim@example.com");
    });

    it("keys the account throttler by account alone, so rotating IPs does not help", () => {
      // Arrange
      const throttler = throttlerNamed(options, ThrottlerName.ACCOUNT);
      const fromOneAddress = makeRequest({
        ip: "203.0.113.7",
        body: { email: "victim@example.com" },
      });
      const fromAnother = makeRequest({
        ip: "198.51.100.2",
        body: { email: "victim@example.com" },
      });

      // Act
      const first = throttler.getTracker?.(
        fromOneAddress as unknown as Record<string, unknown>,
        makeContext(fromOneAddress),
      );
      const second = throttler.getTracker?.(
        fromAnother as unknown as Record<string, unknown>,
        makeContext(fromAnother),
      );

      // Assert
      expect(first).toBe("victim@example.com");
      expect(second).toBe(first);
    });

    it("skips the account-scoped throttlers for a request with no email", () => {
      // Arrange
      const request = makeRequest({ body: { refreshToken: "token" } });

      // Act & Assert
      expect(
        throttlerNamed(options, ThrottlerName.CREDENTIAL).skipIf?.(
          makeContext(request),
        ),
      ).toBe(true);
      expect(
        throttlerNamed(options, ThrottlerName.ACCOUNT).skipIf?.(
          makeContext(request),
        ),
      ).toBe(true);
    });

    it("applies the account-scoped throttlers to a request carrying an email", () => {
      // Arrange
      const request = makeRequest({ body: { email: "victim@example.com" } });

      // Act & Assert
      expect(
        throttlerNamed(options, ThrottlerName.CREDENTIAL).skipIf?.(
          makeContext(request),
        ),
      ).toBe(false);
    });
  });

  describe("when disabled", () => {
    const options = createThrottlerOptions(false, storage);

    it("skips every throttler, including the ones with their own skipIf", () => {
      // Arrange — a per-throttler skipIf replaces the shared one rather than
      // adding to it, so each has to honour the flag itself
      const request = makeRequest({ body: { email: "victim@example.com" } });
      const context = makeContext(request);

      // Act & Assert
      expect(
        (options as Exclude<ThrottlerModuleOptions, unknown[]>).skipIf?.(
          context,
        ),
      ).toBe(true);
      expect(
        throttlerNamed(options, ThrottlerName.CREDENTIAL).skipIf?.(context),
      ).toBe(true);
      expect(
        throttlerNamed(options, ThrottlerName.ACCOUNT).skipIf?.(context),
      ).toBe(true);
    });
  });
});
