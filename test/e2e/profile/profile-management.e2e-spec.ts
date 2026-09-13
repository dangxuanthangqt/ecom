import request from "supertest";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { DEMO_PASSWORD } from "../support/fixtures";
import { prismaTestClient } from "../support/prisma-test-client";

/**
 * Covers `ProfileController` against a throwaway CLIENT account created by
 * this spec (never a seeded fixture user), because the password-change step
 * mutates the account's password — reusing a seeded fixture would break
 * every other spec that logs in with `DEMO_PASSWORD`.
 */
describe("Profile management (F###)", () => {
  let app: TestApp;
  let userId: string;
  let userEmail: string;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();

    const user = await createTestUser({ role: "CLIENT" });
    userId = user.id;
    userEmail = user.email;

    const login = await loginAs(app, user.email, user.password);
    token = login.accessToken;
  });

  afterAll(async () => {
    await prismaTestClient.user.delete({ where: { id: userId } });
    await closeTestApp(app);
  });

  it("reads and updates the authenticated user's own profile", async () => {
    const client = authed(app, token);

    const profileResponse = await client.get("/profile").expect(200);

    expect((profileResponse.body as { id: string }).id).toBe(userId);

    const updatedName = "E2E Updated Name";

    const updateResponse = await client
      .put("/profile")
      .send({ name: updatedName })
      .expect(200);

    expect((updateResponse.body as { name: string }).name).toBe(updatedName);

    const profileAfterUpdate = await client.get("/profile").expect(200);

    expect((profileAfterUpdate.body as { name: string }).name).toBe(
      updatedName,
    );
  });

  it("changes the password and requires the new one on the next login", async () => {
    const client = authed(app, token);
    const newPassword = "E2eNewPassw0rd!";

    await client
      .put("/profile/change-password")
      .send({
        currentPassword: DEMO_PASSWORD,
        newPassword,
        newConfirmPassword: newPassword,
      })
      .expect(200);

    // The old password no longer works. `AuthService.login` reports a wrong
    // password as `badRequest` (400), not `401` — matching
    // `auth-password.e2e-spec.ts`'s existing assertion for the same path.
    await request(app.getHttpServer())
      .post("/auth/login")
      .set("User-Agent", "e2e-test-agent")
      .send({ email: userEmail, password: DEMO_PASSWORD })
      .expect(400);

    // The new password logs in for real.
    await loginAs(app, userEmail, newPassword);
  });

  it("rejects every route without a token", async () => {
    await request(app.getHttpServer()).get("/profile").expect(401);
  });
});
