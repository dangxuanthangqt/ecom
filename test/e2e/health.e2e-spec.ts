import request from "supertest";

import { loginAs } from "./support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "./support/create-test-app";
import { DEMO_PASSWORD, FixtureEmail } from "./support/fixtures";

/**
 * Proves the harness itself: a real app boots against `ecom_e2e`, a public
 * route works, a protected route rejects an anonymous caller, and — the
 * canary for Key Insight 1 — a real login token is actually granted access,
 * which only happens if the permission catalogue sync and role grant seed
 * (`initial-scripts/create-permission.ts`) ran during setup.
 */
describe("e2e harness (health)", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("GET /products is public and returns 200", async () => {
    await request(app.getHttpServer()).get("/products").expect(200);
  });

  it("GET /cart without a token is rejected", async () => {
    await request(app.getHttpServer()).get("/cart").expect(401);
  });

  it("GET /cart with a real login token succeeds (permission sync ran)", async () => {
    const { accessToken } = await loginAs(
      app,
      FixtureEmail.CLIENT,
      DEMO_PASSWORD,
    );

    await request(app.getHttpServer())
      .get("/cart")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
  });
});
