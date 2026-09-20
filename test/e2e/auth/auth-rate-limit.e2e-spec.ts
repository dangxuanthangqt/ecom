import { getOptionsToken } from "@nestjs/throttler";
import { VerificationCodeType } from "@prisma/client";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";

import { RedisService } from "@/shared/services/redis.service";
import { ThrottlerRedisStorage } from "@/shared/services/throttler-redis-storage.service";
import { createThrottlerOptions } from "@/shared/utils/throttler-options.factory";

import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";

interface ErrorEnvelope {
  statusCode: number;
  error: string;
  message: string;
  details: unknown[];
}

const uniqueEmail = () => `e2e-throttle-${uuidv4()}@ecom.local`;

/**
 * Exercises the rate limiter against real Redis with the real policy from
 * `throttle.constant.ts`.
 *
 * The rest of the e2e suite runs with `THROTTLE_ENABLED=false` (see
 * `.env.test.example`): specs fire hundreds of requests from 127.0.0.1 and would
 * otherwise trip the IP limit while testing something else entirely.
 *
 * This file turns it back on for its own app only, by overriding the throttler
 * options provider. Assigning to `process.env` does not work here:
 * `ConfigModule.forRoot()` snapshots the environment when `base.module.ts` is
 * first imported, which happens before any `beforeAll` — an earlier version of
 * this spec did exactly that and silently tested nothing.
 */
describe("auth rate limiting", () => {
  let app: TestApp;

  const login = (email: string) =>
    request(app.getHttpServer())
      .post("/auth/login")
      .set("User-Agent", "e2e-test-agent")
      .send({ email, password: "wrong-password-123" });

  const requestOtp = (email: string) =>
    request(app.getHttpServer())
      .post("/auth/otp")
      .send({ email, type: VerificationCodeType.REGISTER });

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder.overrideProvider(getOptionsToken()).useFactory({
        factory: (storage: ThrottlerRedisStorage) =>
          createThrottlerOptions(true, storage),
        inject: [ThrottlerRedisStorage],
      }),
    );
  });

  afterAll(async () => {
    // Nothing global to restore: the override lives on this app instance only.
    await closeTestApp(app);
  });

  beforeEach(async () => {
    // Every test starts from a clean budget, including the shared per-IP one.
    const client = app.get(RedisService).client;
    const keys = await client.keys("throttle:*");

    if (keys.length > 0) {
      await client.del(...keys);
    }
  });

  it("blocks a sixth login attempt against the same account", async () => {
    // Arrange — policy allows five per minute per address+account
    const email = uniqueEmail();

    // Act — failed attempts still spend budget, which is the point
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(email).expect(400);
    }

    const blocked = await login(email);

    // Assert
    expect(blocked.status).toBe(429);
  });

  it("answers a throttled request in the shared error envelope", async () => {
    // Arrange
    const email = uniqueEmail();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(email);
    }

    // Act
    const blocked = await login(email);
    const body = blocked.body as ErrorEnvelope;

    // Assert
    expect(body).toMatchObject({
      statusCode: 429,
      error: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
      details: [],
    });
  });

  it("tells the caller how long to wait, under the standard header name", async () => {
    // Arrange
    const email = uniqueEmail();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(email);
    }

    // Act
    const blocked = await login(email);

    // Assert — a named throttler would otherwise emit `Retry-After-credential`
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("keeps the block after the counting window's budget is spent", async () => {
    // Arrange — the block outlives the 1-minute window it was earned in
    const email = uniqueEmail();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await login(email);
    }

    // Act
    const stillBlocked = await login(email);

    // Assert
    expect(stillBlocked.status).toBe(429);
    expect(Number(stillBlocked.headers["retry-after"])).toBeGreaterThan(60);
  });

  it("does not penalise a different account from the same address", async () => {
    // Arrange
    const blockedEmail = uniqueEmail();
    const innocentEmail = uniqueEmail();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await login(blockedEmail);
    }

    // Act
    const innocent = await login(innocentEmail);

    // Assert — one account under attack must not lock out the whole address
    expect(innocent.status).toBe(400);
  });

  it("caps OTP issuance well below the login limit", async () => {
    // Arrange — three per minute: each call sends mail to an address the caller
    // has not proven it owns
    const email = uniqueEmail();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await requestOtp(email).expect(200);
    }

    // Act
    const blocked = await requestOtp(email);

    // Assert
    expect(blocked.status).toBe(429);
  });

  it("leaves a request with no account in it to the per-address limit alone", async () => {
    // Arrange — refresh carries a token, not an email, so the account-scoped
    // throttlers skip it and its budget is far larger than five
    const responses: request.Response[] = [];

    // Act
    for (let attempt = 0; attempt < 8; attempt += 1) {
      responses.push(
        await request(app.getHttpServer())
          .post("/auth/refresh-token")
          .send({ refreshToken: "not-a-real-token" }),
      );
    }

    // Assert
    expect(responses.map((response) => response.status)).not.toContain(429);
  });
});
