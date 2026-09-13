import { v4 as uuidv4 } from "uuid";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { BrandId, CategoryId } from "../support/fixtures";
import { prismaTestClient } from "../support/prisma-test-client";

/**
 * Full seller-owned CRUD round-trip against `ManageProductController`. Every
 * product created here is created by the owner seller provisioned in this
 * file and deleted by the DELETE step itself (or by `afterAll` if a step
 * fails first) — the seeded catalogue in `prisma/seed/seed-ids.ts` is never
 * touched.
 */
describe("Seller manage-product CRUD (F008)", () => {
  let app: TestApp;
  let ownerToken: string;
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const owner = await createTestUser({ role: "SELLER" });
    const login = await loginAs(app, owner.email, owner.password);
    ownerToken = login.accessToken;
  });

  afterAll(async () => {
    // Defence in depth: a re-run starts clean even if an assertion above
    // threw before the DELETE step ran.
    if (createdProductIds.length > 0) {
      await prismaTestClient.sKU.deleteMany({
        where: { productId: { in: createdProductIds } },
      });
      await prismaTestClient.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
    }

    await closeTestApp(app);
  });

  const variants = [{ value: "Color", options: ["Red"] }];
  const skus = [
    {
      value: "Red",
      price: 1_000_000,
      stock: 10,
      image: "https://example.com/e2e-sku.jpg",
    },
  ];

  function buildCreateBody(name: string) {
    return {
      name,
      basePrice: 1_000_000,
      virtualPrice: 900_000,
      images: ["https://example.com/e2e-product.jpg"],
      brandId: BrandId.APPLE,
      categoryIds: [CategoryId.ELECTRONICS],
      variants,
      skus,
    };
  }

  it("round-trips create -> read -> update -> list -> delete -> 404", async () => {
    const client = authed(app, ownerToken);
    const productName = `E2E Manage Product ${uuidv4().slice(0, 8)}`;

    // -- create --
    const createResponse = await client
      .post("/manage-product/products")
      .send(buildCreateBody(productName))
      // `ApiAuth`'s default `statusCode: HttpStatus.OK` applies `@HttpCode(200)`
      // to every non-GET route it decorates, overriding Nest's implicit 201
      // for POST — every mutating route in this controller responds 200.
      .expect(200);

    const created = createResponse.body as { id: string; name: string };

    expect(created.id).toBeDefined();
    expect(created.name).toBe(productName);
    createdProductIds.push(created.id);

    // -- read back --
    const readResponse = await client
      .get(`/manage-product/products/${created.id}`)
      .expect(200);

    const read = readResponse.body as { id: string; name: string };

    expect(read.id).toBe(created.id);
    expect(read.name).toBe(productName);

    // -- update --
    // `UpdateProductRequestDto` keeps `variants`/`skus` required (they are
    // picked from `ProductRequestDto` without `PartialType`) — a PUT fully
    // replaces the variant/SKU set, so a realistic update body always
    // repeats them rather than sending only the field that changed.
    const updatedName = `${productName} (updated)`;

    await client
      .put(`/manage-product/products/${created.id}`)
      .send({ name: updatedName, variants, skus })
      .expect(200);

    const readAfterUpdate = await client
      .get(`/manage-product/products/${created.id}`)
      .expect(200);

    expect((readAfterUpdate.body as { name: string }).name).toBe(updatedName);

    // -- list --
    const listResponse = await client
      .get("/manage-product/products")
      .expect(200);

    const list = listResponse.body as { data: { id: string }[] };

    expect(list.data.some((product) => product.id === created.id)).toBe(true);

    // -- delete --
    await client.delete(`/manage-product/products/${created.id}`).expect(200);

    // -- follow-up read 404s --
    await client.get(`/manage-product/products/${created.id}`).expect(404);

    // Already deleted through the API; drop it from the cleanup list so
    // `afterAll` does not redundantly delete an already-gone row.
    createdProductIds.length = 0;
  });
});
