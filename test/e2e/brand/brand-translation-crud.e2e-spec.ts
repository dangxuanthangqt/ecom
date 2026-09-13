import { v4 as uuidv4 } from "uuid";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { LanguageId } from "../support/fixtures";
import { prismaTestClient } from "../support/prisma-test-client";

/**
 * CRUD round-trip against `BrandTranslationController`, scoped to a brand
 * created (and deleted) by this spec so the seeded catalogue is never
 * touched. `Brand.onDelete: Cascade` on `BrandTranslation.brandId` means
 * deleting the parent brand in `afterAll` also removes any translation left
 * behind by a failed assertion.
 */
describe("Brand translation CRUD (F###)", () => {
  let app: TestApp;
  let adminToken: string;
  let brandId: string;

  beforeAll(async () => {
    app = await createTestApp();

    const admin = await createTestUser({ role: "ADMIN" });
    const login = await loginAs(app, admin.email, admin.password);
    adminToken = login.accessToken;

    const brand = await prismaTestClient.brand.create({
      data: {
        name: `E2E Brand For Translation ${uuidv4().slice(0, 8)}`,
        logo: "https://example.com/e2e-brand.png",
      },
    });

    brandId = brand.id;
  });

  afterAll(async () => {
    await prismaTestClient.brand.delete({ where: { id: brandId } });
    await closeTestApp(app);
  });

  it("round-trips create -> read -> update -> list -> delete -> 404", async () => {
    const client = authed(app, adminToken);
    const name = `E2E Brand Translation ${uuidv4().slice(0, 8)}`;

    const createResponse = await client
      .post("/brand-translations")
      .send({
        name,
        description: "E2E brand translation description",
        languageId: LanguageId.EN,
        brandId,
      })
      .expect(200);

    const created = createResponse.body as { id: string; name: string };

    expect(created.id).toBeDefined();
    expect(created.name).toBe(name);

    const readResponse = await client
      .get(`/brand-translations/${created.id}`)
      .expect(200);

    expect((readResponse.body as { name: string }).name).toBe(name);

    const updatedName = `${name} (updated)`;

    await client
      .put(`/brand-translations/${created.id}`)
      .send({ name: updatedName })
      .expect(200);

    const readAfterUpdate = await client
      .get(`/brand-translations/${created.id}`)
      .expect(200);

    expect((readAfterUpdate.body as { name: string }).name).toBe(updatedName);

    // `keyword` filters by name — the default page (pageSize 10, oldest
    // first) would otherwise never contain a row created after the seeded
    // fixtures, since ordering defaults to `createdAt` ascending.
    const listResponse = await client
      .get(`/brand-translations?keyword=${encodeURIComponent(updatedName)}`)
      .expect(200);
    const list = listResponse.body as { data: { id: string }[] };

    expect(list.data.some((translation) => translation.id === created.id)).toBe(
      true,
    );

    await client.delete(`/brand-translations/${created.id}`).expect(200);

    await client.get(`/brand-translations/${created.id}`).expect(404);
  });
});
