import request from "supertest";

import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { ProductId } from "../support/fixtures";

/**
 * `GET /products` / `GET /products/:id` (`ProductController`) carry
 * `@IsPublicApi()` — no `Authorization` header is sent anywhere in this file,
 * on purpose: it is the coverage for the guard's `AuthorizationType.NONE`
 * path. Every assertion reads seeded fixtures only; nothing here mutates data.
 */
describe("Public product browsing (F007)", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe("GET /products", () => {
    it("returns the published catalogue with no Authorization header", async () => {
      const response = await request(app.getHttpServer())
        .get("/products")
        .expect(200);

      const body = response.body as {
        data: { id: string }[];
        pagination: { totalItems: number };
      };

      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination.totalItems).toBeGreaterThan(0);
    });

    it("never surfaces the unpublished draft product", async () => {
      // The catalogue is paginated (default pageSize 10), so scanning page 1
      // would not prove absence. Filter by name instead, matching the
      // repository's `where.name.contains` on the exact seeded draft name.
      const response = await request(app.getHttpServer())
        .get("/products")
        .query({ name: "Unpublished" })
        .expect(200);

      const body = response.body as { data: { id: string }[] };

      expect(
        body.data.some((product) => product.id === ProductId.UNPUBLISHED_DRAFT),
      ).toBe(false);
    });
  });

  describe("GET /products/:id", () => {
    it("returns the hero product with its SKUs", async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${ProductId.IPHONE_15}`)
        .expect(200);

      const body = response.body as {
        id: string;
        skus: { id: string }[];
      };

      expect(body.id).toBe(ProductId.IPHONE_15);
      expect(Array.isArray(body.skus)).toBe(true);
      expect(body.skus.length).toBeGreaterThan(0);
    });

    it("404s for a well-formed but unknown UUID", async () => {
      await request(app.getHttpServer())
        .get("/products/00000000-0000-4000-8000-999999999999")
        .expect(404);
    });

    it("rejects a non-UUID id with a validation error", async () => {
      await request(app.getHttpServer())
        .get("/products/not-a-uuid")
        .expect(400);
    });
  });
});
