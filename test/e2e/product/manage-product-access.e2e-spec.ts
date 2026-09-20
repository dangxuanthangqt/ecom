import request from "supertest";
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
 * `manage-product` access control: the guard's 401/403 path, the
 * `RolePermissionCacheService`-backed CLIENT-vs-SELLER permission gap
 * (`RolePermissionMatrix` grants `product:*:own` only
 * to SELLER/ADMIN), and the service-level cross-seller ownership check in
 * `ManageProductService.validateOwnership`. Every denial is paired
 * with a positive control on the same route so a 403 cannot be mistaken for
 * "the whole route is broken".
 */
describe("Manage-product access control (F008)", () => {
  let app: TestApp;
  let sellerAToken: string;
  let sellerBToken: string;
  let clientToken: string;
  let sellerAProductId: string;

  beforeAll(async () => {
    app = await createTestApp();

    const sellerA = await createTestUser({ role: "SELLER" });
    const sellerB = await createTestUser({ role: "SELLER" });
    const client = await createTestUser({ role: "CLIENT" });

    sellerAToken = (await loginAs(app, sellerA.email, sellerA.password))
      .accessToken;
    sellerBToken = (await loginAs(app, sellerB.email, sellerB.password))
      .accessToken;
    clientToken = (await loginAs(app, client.email, client.password))
      .accessToken;

    const createResponse = await authed(app, sellerAToken)
      .post("/manage-product/products")
      .send({
        name: `E2E Access Product ${uuidv4().slice(0, 8)}`,
        basePrice: 500_000,
        virtualPrice: 450_000,
        images: ["https://example.com/e2e-access-product.jpg"],
        brandId: BrandId.APPLE,
        categoryIds: [CategoryId.ELECTRONICS],
        variants: [{ value: "Color", options: ["Blue"] }],
        skus: [
          {
            value: "Blue",
            price: 500_000,
            stock: 5,
            image: "https://example.com/e2e-access-sku.jpg",
          },
        ],
      })
      // `ApiAuth`'s default `statusCode: HttpStatus.OK` applies `@HttpCode(200)`
      // to every non-GET route it decorates, overriding Nest's implicit 201
      // for POST — every mutating route in this controller responds 200.
      .expect(200);

    sellerAProductId = (createResponse.body as { id: string }).id;
  });

  afterAll(async () => {
    // Guard against an unset id (e.g. `beforeAll`'s own create request
    // failing before assignment): an unguarded `{ productId: undefined }`
    // filter is dropped entirely by Prisma, which would delete every SKU
    // row in the database instead of doing nothing.
    if (sellerAProductId) {
      await prismaTestClient.sKU.deleteMany({
        where: { productId: sellerAProductId },
      });
      await prismaTestClient.product.deleteMany({
        where: { id: sellerAProductId },
      });
    }

    await closeTestApp(app);
  });

  it("401s with no Authorization header", async () => {
    await request(app.getHttpServer())
      .get("/manage-product/products")
      .expect(401);
  });

  it("403s a CLIENT token, through AccessTokenGuard's permission check", async () => {
    const deniedResponse = await authed(app, clientToken)
      .get("/manage-product/products")
      .expect(403);

    expect((deniedResponse.body as { message: string }).message).toBe(
      "You do not have permission to access this resource.",
    );

    // Positive control: the same route with a SELLER token succeeds, so the
    // 403 above is a real permission gap, not the guard misbehaving for
    // every caller.
    await authed(app, sellerAToken).get("/manage-product/products").expect(200);
  });

  it("denies seller B from updating seller A's product, and the row is unchanged", async () => {
    const originalProduct = await prismaTestClient.product.findUniqueOrThrow({
      where: { id: sellerAProductId },
      select: { name: true },
    });

    // `UpdateProductRequestDto` keeps `variants`/`skus` required (picked from
    // `ProductRequestDto` without `PartialType`), so a realistic PUT body
    // repeats them even though this request is expected to be denied before
    // they matter.
    await authed(app, sellerBToken)
      .put(`/manage-product/products/${sellerAProductId}`)
      .send({
        name: "Hijacked by seller B",
        variants: [{ value: "Color", options: ["Blue"] }],
        skus: [
          {
            value: "Blue",
            price: 500_000,
            stock: 5,
            image: "https://example.com/e2e-access-sku.jpg",
          },
        ],
      })
      .expect(403);

    const productAfterDeniedUpdate =
      await prismaTestClient.product.findUniqueOrThrow({
        where: { id: sellerAProductId },
        select: { name: true },
      });

    expect(productAfterDeniedUpdate.name).toBe(originalProduct.name);
  });

  it("denies seller B from deleting seller A's product, and the row still exists", async () => {
    await authed(app, sellerBToken)
      .delete(`/manage-product/products/${sellerAProductId}`)
      .expect(403);

    const stillExists = await prismaTestClient.product.findUnique({
      where: { id: sellerAProductId },
    });

    expect(stillExists).not.toBeNull();
    expect(stillExists?.deletedAt).toBeNull();
  });

  it("rejects an empty create body with field-level validation errors", async () => {
    // `variants`/`skus` are sent as empty arrays rather than omitted:
    // `IsUniqueVariantConstraint`/`IsValidSKUsConstraint` (product.validation.ts)
    // read `.length` off these properties without a null guard, so an
    // entirely absent key throws inside the validator and surfaces as a 500
    // instead of a clean validation response — a pre-existing gap in
    // `src/dtos/product/product.validation.ts`, out of this phase's file
    // scope. Every other required field is still omitted, so this remains a
    // real "empty submission" from the caller's perspective.
    const response = await authed(app, sellerAToken)
      .post("/manage-product/products")
      .send({ variants: [], skus: [] })
      .expect(400);

    const body = response.body as { details: { field: string }[] };

    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.some((detail) => detail.field === "name")).toBe(true);
  });
});
