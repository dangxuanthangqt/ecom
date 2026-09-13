import request from "supertest";
import { v4 as uuidv4 } from "uuid";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { prismaTestClient } from "../support/prisma-test-client";

/**
 * ADMIN-owned CRUD round-trip against `BrandController`. Every brand created
 * here is created and deleted by this spec — the seeded catalogue in
 * `prisma/seed/seed-ids.ts` (`BrandId.*`) is never touched.
 *
 * `GET /brands/:id` is asserted at `400`/`401` below, not the `200` its
 * `@ApiPublic` Swagger tag and summary ("Get a brand by ID") imply — see the
 * two findings this spec surfaced, recorded in
 * `docs/e2e-testing.md` § "Production-code findings".
 */
describe("Brand CRUD (F###)", () => {
  let app: TestApp;
  let adminToken: string;
  const createdBrandIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const admin = await createTestUser({ role: "ADMIN" });
    const login = await loginAs(app, admin.email, admin.password);
    adminToken = login.accessToken;
  });

  afterAll(async () => {
    if (createdBrandIds.length > 0) {
      await prismaTestClient.brand.deleteMany({
        where: { id: { in: createdBrandIds } },
      });
    }

    await closeTestApp(app);
  });

  it("creates, updates, lists and deletes a brand", async () => {
    const client = authed(app, adminToken);
    const brandName = `E2E Brand ${uuidv4().slice(0, 8)}`;

    const createResponse = await client
      .post("/brands")
      .send({ name: brandName, logo: "https://example.com/e2e-brand.png" })
      // Every mutating route in this controller applies `ApiAuth`'s default
      // `@HttpCode(200)`, overriding Nest's implicit 201 for POST.
      .expect(200);

    const created = createResponse.body as { id: string; name: string };

    expect(created.id).toBeDefined();
    expect(created.name).toBe(brandName);
    createdBrandIds.push(created.id);

    const updatedName = `${brandName} (updated)`;

    await client
      .put(`/brands/${created.id}`)
      .send({ name: updatedName })
      .expect(200);

    // `keyword` filters by name — the default page (pageSize 10, oldest
    // first) would otherwise never contain a row created after the seeded
    // fixtures, since ordering defaults to `createdAt` ascending.
    const listResponse = await client
      .get(`/brands?keyword=${encodeURIComponent(updatedName)}`)
      .expect(200);
    const list = listResponse.body as { data: { id: string; name: string }[] };

    expect(
      list.data.some(
        (brand) => brand.id === created.id && brand.name === updatedName,
      ),
    ).toBe(true);

    await client.delete(`/brands/${created.id}`).send({}).expect(200);

    const listAfterDelete = await client
      .get(`/brands?keyword=${encodeURIComponent(updatedName)}`)
      .expect(200);

    expect(
      (listAfterDelete.body as { data: { id: string }[] }).data.some(
        (brand) => brand.id === created.id,
      ),
    ).toBe(false);

    createdBrandIds.length = 0;
  });

  it("exposes GET /brands (list) without authentication", async () => {
    await request(app.getHttpServer()).get("/brands").expect(200);
  });

  it("rejects mutation without a token", async () => {
    await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Unauthorized Brand", logo: "https://example.com/x.png" })
      .expect(401);
  });

  it(
    "finding: GET /brands/:id requires auth despite its @ApiPublic Swagger " +
      "tag — BrandController never applies @IsPublicApi() to this route, " +
      "unlike GET /brands (list)",
    async () => {
      // The id doesn't need to resolve to a real row: the auth guard runs
      // before the controller ever sees it.
      await request(app.getHttpServer())
        .get("/brands/00000000-0000-4000-8000-000000000001")
        .expect(401);
    },
  );

  it(
    "finding: GET /brands/:id 400s for an authenticated request with a " +
      'genuinely valid brand id — `getBrandById(@Param("id") param: ' +
      "BrandIdParamDto)` binds only the raw id string to a param typed as " +
      "the whole DTO, so `ValidationPipe` never populates `param.id` and " +
      "`@IsUUID` fails on `undefined`. Sibling handlers " +
      "(updateBrand/deleteBrand) use `@Param() param: BrandIdParamDto` " +
      "(the whole params object) and do not have this bug.",
    async () => {
      const client = authed(app, adminToken);

      const brand = await prismaTestClient.brand.create({
        data: {
          name: `E2E Brand For Get-By-Id Bug ${uuidv4().slice(0, 8)}`,
          logo: "https://example.com/e2e-brand.png",
        },
      });

      try {
        await client.get(`/brands/${brand.id}`).expect(400);
      } finally {
        await prismaTestClient.brand.delete({ where: { id: brand.id } });
      }
    },
  );
});
