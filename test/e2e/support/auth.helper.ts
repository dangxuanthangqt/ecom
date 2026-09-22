import request from "supertest";
import { v4 as uuidv4 } from "uuid";

import { VerificationCodeType } from "@/generated/prisma/client";
import { HashingService } from "@/shared/services/hashing.service";

import { TestApp } from "./create-test-app";
import { DEMO_PASSWORD, RoleId } from "./fixtures";
import { prismaTestClient } from "./prisma-test-client";

const hashingService = new HashingService();

type TestRole = "ADMIN" | "CLIENT" | "SELLER";

const ROLE_ID_BY_TEST_ROLE: Record<TestRole, string> = {
  ADMIN: RoleId.ADMIN,
  CLIENT: RoleId.CLIENT,
  SELLER: RoleId.SELLER,
};

export interface TestUser {
  id: string;
  email: string;
  password: string;
  roleId: string;
}

/**
 * Provisions an account straight through Prisma + `HashingService`, exactly
 * like `demo-users.seeder.ts` does. `POST /auth/register` always assigns the
 * CLIENT role, so any spec that needs a SELLER or ADMIN actor has no endpoint
 * to get one from — going straight to the database is the only option, not a
 * shortcut around auth (the token used to call protected routes still comes
 * from a real `POST /auth/login`, see `loginAs`).
 */
export async function createTestUser(opts?: {
  role?: TestRole;
  email?: string;
}): Promise<TestUser> {
  const role = opts?.role ?? "CLIENT";
  const roleId = ROLE_ID_BY_TEST_ROLE[role];
  const email = opts?.email ?? `e2e-${uuidv4()}@ecom.local`;
  const password = DEMO_PASSWORD;

  const user = await prismaTestClient.user.create({
    data: {
      email,
      name: `E2E ${role} ${uuidv4().slice(0, 8)}`,
      phoneNumber: `09${Math.floor(Math.random() * 1e8)
        .toString()
        .padStart(8, "0")}`,
      password: hashingService.hash(password),
      roleId,
      status: "ACTIVE",
    },
  });

  return { id: user.id, email: user.email, password, roleId };
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

/**
 * Decodes the `userId` claim out of the JWT payload without verifying the
 * signature. Verification is redundant here — the token just arrived
 * straight from this same app's own `POST /auth/login` response over
 * supertest, not from an untrusted source — and pulling in `jsonwebtoken`
 * directly would be a new dependency for a one-line base64url decode.
 */
function decodeUserId(accessToken: string): string {
  const payloadSegment = accessToken.split(".")[1];

  if (!payloadSegment) {
    throw new Error("Access token is not a valid JWT: missing payload segment");
  }

  const json = Buffer.from(payloadSegment, "base64url").toString("utf8");
  const payload = JSON.parse(json) as { userId?: string };

  if (!payload.userId) {
    throw new Error("Access token payload does not carry a userId claim");
  }

  return payload.userId;
}

/**
 * Logs in for real: `POST /auth/login` through the booted app, so the
 * `AuthorizationHeaderGuard → AccessTokenGuard → RolePermissionCacheService`
 * chain that later protected requests replay is backed by a token this same
 * guard chain will accept. Never shortcut to signing a token directly.
 */
export async function loginAs(
  app: TestApp,
  email: string,
  password: string,
): Promise<LoginResult> {
  const response = await request(app.getHttpServer())
    .post("/auth/login")
    // `AuthService.login` creates a `Device` row with a required `userAgent`
    // column via the `@UserAgent()` param decorator, which reads the raw
    // header with no fallback — supertest sends no `User-Agent` unless told
    // to, unlike every real client, so this would otherwise 500.
    .set("User-Agent", "e2e-test-agent")
    .send({ email, password })
    .expect(200);

  const body = response.body as { accessToken: string; refreshToken: string };

  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: decodeUserId(body.accessToken),
  };
}

/** A supertest wrapper that presets the `Authorization: Bearer` header. */
export function authed(app: TestApp, token: string) {
  const server = app.getHttpServer();
  const withAuth = (req: request.Test) =>
    req.set("Authorization", `Bearer ${token}`);

  return {
    get: (url: string) => withAuth(request(server).get(url)),
    post: (url: string) => withAuth(request(server).post(url)),
    put: (url: string) => withAuth(request(server).put(url)),
    patch: (url: string) => withAuth(request(server).patch(url)),
    delete: (url: string) => withAuth(request(server).delete(url)),
  };
}

/**
 * Requests an OTP through the real endpoint, then reads the code back out of
 * Postgres — `AuthService.sendOTP`'s Resend call is dead code (commented
 * out), so no mail mocking is needed or possible. Returns the most recent
 * matching code in case a spec requests more than one OTP for the same
 * email/type.
 */
export async function requestOtp(
  app: TestApp,
  email: string,
  type: VerificationCodeType,
): Promise<string> {
  await request(app.getHttpServer())
    .post("/auth/otp")
    .send({ email, type })
    .expect(200);

  const verificationCode =
    await prismaTestClient.verificationCode.findFirstOrThrow({
      where: { email, type },
      orderBy: { createdAt: "desc" },
    });

  return verificationCode.code;
}
