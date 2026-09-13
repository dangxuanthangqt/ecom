import request from "supertest";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { prismaTestClient } from "../support/prisma-test-client";

/**
 * CRUD round-trip against `LanguageController`. Uses a made-up two-letter
 * code (`zz`) that never collides with the seeded `LanguageId.EN`/`VI` rows
 * (`en`/`vi`), which `brand-translation`/`category-translation` specs and the
 * seeded catalogue depend on.
 */
describe("Language CRUD (F###)", () => {
  let app: TestApp;
  let adminToken: string;
  const LANGUAGE_ID = "zz";

  beforeAll(async () => {
    app = await createTestApp();

    const admin = await createTestUser({ role: "ADMIN" });
    const login = await loginAs(app, admin.email, admin.password);
    adminToken = login.accessToken;
  });

  afterAll(async () => {
    // Defence in depth: a re-run starts clean even if an assertion above
    // threw before the DELETE step ran.
    await prismaTestClient.language.deleteMany({
      where: { id: LANGUAGE_ID },
    });

    await closeTestApp(app);
  });

  it("round-trips create -> read -> update -> list -> delete -> 404", async () => {
    const client = authed(app, adminToken);

    const createResponse = await client
      .post("/languages/create")
      .send({ id: LANGUAGE_ID, name: "E2E Test Language" })
      .expect(200);

    const created = createResponse.body as { id: string; name: string };

    expect(created.id).toBe(LANGUAGE_ID);
    expect(created.name).toBe("E2E Test Language");

    const readResponse = await client
      .get(`/languages/${LANGUAGE_ID}`)
      .expect(200);

    expect((readResponse.body as { name: string }).name).toBe(
      "E2E Test Language",
    );

    await client
      .put(`/languages/${LANGUAGE_ID}`)
      .send({ name: "E2E Test Language (updated)" })
      .expect(200);

    const readAfterUpdate = await client
      .get(`/languages/${LANGUAGE_ID}`)
      .expect(200);

    expect((readAfterUpdate.body as { name: string }).name).toBe(
      "E2E Test Language (updated)",
    );

    const listResponse = await client.get("/languages").expect(200);
    const list = listResponse.body as { data: { id: string }[] };

    expect(list.data.some((language) => language.id === LANGUAGE_ID)).toBe(
      true,
    );

    await client.delete(`/languages/${LANGUAGE_ID}`).expect(200);

    await client.get(`/languages/${LANGUAGE_ID}`).expect(404);
  });

  it("rejects every route without a token", async () => {
    await request(app.getHttpServer()).get("/languages").expect(401);
  });
});
