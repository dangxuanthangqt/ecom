import { JwtService } from "@nestjs/jwt";
import request from "supertest";

import { authed, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { DEMO_PASSWORD, FixtureEmail } from "../support/fixtures";

interface MessageResponseBody {
  message: string;
}

interface TokenPairResponseBody {
  accessToken: string;
  refreshToken: string;
}

interface GoogleAuthUrlResponseBody {
  url: string;
}

/**
 * Refresh/logout/reuse over real HTTP, plus the `AuthorizationHeaderGuard` /
 * `AccessTokenGuard` rejection paths and the role-permission cache-hit path.
 * Uses the seeded fixture user (`client@ecom.local`) read-only: nothing here
 * mutates its password, role, or 2FA state — every request logs in fresh.
 */
describe("auth session flow", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("refreshes tokens and rejects reuse of the rotated refresh token", async () => {
    const { refreshToken: originalRefreshToken } = await loginAs(
      app,
      FixtureEmail.CLIENT,
      DEMO_PASSWORD,
    );

    const refreshResponse = await request(app.getHttpServer())
      .post("/auth/refresh-token")
      .send({ refreshToken: originalRefreshToken })
      .expect(200);

    const refreshBody = refreshResponse.body as TokenPairResponseBody;
    expect(refreshBody.accessToken).toEqual(expect.any(String));
    expect(refreshBody.refreshToken).toEqual(expect.any(String));
    expect(refreshBody.refreshToken).not.toBe(originalRefreshToken);

    // The rotated-out token was deleted as part of the rotation, so reusing
    // it must fail — `RefreshTokenRepository.findUniqueOrThrow` maps a
    // missing row to a real 404, not a mocked guard rejection.
    const reuseResponse = await request(app.getHttpServer())
      .post("/auth/refresh-token")
      .send({ refreshToken: originalRefreshToken })
      .expect(404);

    expect((reuseResponse.body as MessageResponseBody).message).toBe(
      "Refresh token not found.",
    );
  });

  it("logs out, invalidating the refresh token so a second logout with it fails", async () => {
    const { refreshToken, accessToken } = await loginAs(
      app,
      FixtureEmail.CLIENT,
      DEMO_PASSWORD,
    );

    const logoutResponse = await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);

    expect((logoutResponse.body as MessageResponseBody).message).toBe(
      "Logout successfully.",
    );

    // The refresh token row is gone; deleting it again is the observable
    // proof that logout took effect, not just a status message.
    await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(500);
  });

  it("rejects logout with no Authorization header", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/logout")
      .send({ refreshToken: "does-not-matter" })
      .expect(401);

    expect((response.body as MessageResponseBody).message).toBe(
      "Access token is required.",
    );
  });

  it("rejects a protected route call carrying a syntactically valid but unsigned token", async () => {
    const jwtService = new JwtService();
    const forgedToken = jwtService.sign(
      {
        userId: "forged",
        deviceId: "forged",
        roleId: "forged",
        roleName: "CLIENT",
      },
      { secret: "not-the-real-secret", expiresIn: "5m" },
    );

    const response = await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${forgedToken}`)
      .send({ refreshToken: "does-not-matter" })
      .expect(401);

    expect((response.body as MessageResponseBody).message).toBe(
      "Access token is invalid.",
    );
  });

  it("rejects refresh-token given a garbage token", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/refresh-token")
      .send({ refreshToken: "garbage.garbage.garbage" });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("serves two consecutive authenticated requests via the role-permission cache", async () => {
    const { accessToken } = await loginAs(
      app,
      FixtureEmail.CLIENT,
      DEMO_PASSWORD,
    );
    const client = authed(app, accessToken);

    // First request populates the Redis snapshot (RolePermissionCacheService
    // cache miss -> Postgres read -> cache write); the second reads it back.
    await client.get("/cart").expect(200);
    await client.get("/cart").expect(200);
  });

  it("returns a well-formed Google authorization URL", async () => {
    const response = await request(app.getHttpServer())
      .get("/auth/google/authorization-url")
      .expect(200);

    const { url } = response.body as GoogleAuthUrlResponseBody;
    expect(url).toEqual(expect.any(String));
    expect(new URL(url).host).toBe("accounts.google.com");
  });
});
