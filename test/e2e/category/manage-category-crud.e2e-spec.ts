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
 * Full ADMIN-owned CRUD round-trip against `CategoryController`. Every
 * category created here is created and deleted by this spec — the seeded
 * catalogue in `prisma/seed/seed-ids.ts` (`CategoryId.*`) is never touched.
 * Unlike brands, every category route requires auth (there is no public
 * `CATEGORIES` read route on this controller — `GET /categories` is
 * `@ApiAuth`), so this spec logs in for every request.
 */
describe("Category CRUD (F###)", () => {
  let app: TestApp;
  let adminToken: string;
  const createdCategoryIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const admin = await createTestUser({ role: "ADMIN" });
    const login = await loginAs(app, admin.email, admin.password);
    adminToken = login.accessToken;
  });

  afterAll(async () => {
    if (createdCategoryIds.length > 0) {
      await prismaTestClient.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
    }

    await closeTestApp(app);
  });

  it("round-trips create -> read -> update -> list -> delete -> 404", async () => {
    const client = authed(app, adminToken);
    const name = `E2E Category ${uuidv4().slice(0, 8)}`;

    const createResponse = await client
      .post("/categories")
      .send({ name })
      .expect(200);

    const created = createResponse.body as { id: string; name: string };

    expect(created.id).toBeDefined();
    expect(created.name).toBe(name);
    createdCategoryIds.push(created.id);

    const readResponse = await client
      .get(`/categories/${created.id}`)
      .expect(200);

    expect((readResponse.body as { name: string }).name).toBe(name);

    const updatedName = `${name} (updated)`;

    await client
      .put(`/categories/${created.id}`)
      .send({ name: updatedName })
      .expect(200);

    const readAfterUpdate = await client
      .get(`/categories/${created.id}`)
      .expect(200);

    expect((readAfterUpdate.body as { name: string }).name).toBe(updatedName);

    // Unlike brand/permission/role, `GET /categories` (`CategoryService.
    // getAllCategories`) is not paginated at all — it returns every row in
    // one response — so no `keyword`/`pageSize` param is needed or available
    // here.
    const listResponse = await client.get("/categories").expect(200);
    const list = listResponse.body as { data: { id: string }[] };

    expect(list.data.some((category) => category.id === created.id)).toBe(true);

    await client.delete(`/categories/${created.id}`).expect(200);

    await client.get(`/categories/${created.id}`).expect(404);

    createdCategoryIds.length = 0;
  });

  it("rejects every route without a token", async () => {
    await request(app.getHttpServer()).get("/categories").expect(401);
  });
});
