import request from "supertest";
import { v4 as uuidv4 } from "uuid";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { BrandId, CategoryId, LanguageId } from "../support/fixtures";
import { prismaTestClient } from "../support/prisma-test-client";

/**
 * Minimal `product-translation` coverage: only what phase 04/05 (cart/order)
 * need to exercise their own read/write flows through a real translation row.
 * Full CRUD/list coverage is explicitly out of scope for this phase.
 */
describe("Product translations (minimal, F008 support)", () => {
  let app: TestApp;
  let sellerToken: string;
  let ownedProductId: string;
  let createdTranslationId: string | undefined;

  beforeAll(async () => {
    app = await createTestApp();

    const seller = await createTestUser({ role: "SELLER" });
    sellerToken = (await loginAs(app, seller.email, seller.password))
      .accessToken;

    const createProductResponse = await authed(app, sellerToken)
      .post("/manage-product/products")
      .send({
        name: `E2E Translation Host Product ${uuidv4().slice(0, 8)}`,
        basePrice: 200_000,
        virtualPrice: 180_000,
        images: ["https://example.com/e2e-translation-product.jpg"],
        brandId: BrandId.APPLE,
        categoryIds: [CategoryId.ELECTRONICS],
        variants: [{ value: "Color", options: ["Black"] }],
        skus: [
          {
            value: "Black",
            price: 200_000,
            stock: 5,
            image: "https://example.com/e2e-translation-sku.jpg",
          },
        ],
      })
      // `ApiAuth`'s default `statusCode: HttpStatus.OK` applies `@HttpCode(200)`
      // to every non-GET route it decorates, overriding Nest's implicit 201
      // for POST — every mutating route on these controllers responds 200.
      .expect(200);

    ownedProductId = (createProductResponse.body as { id: string }).id;
  });

  afterAll(async () => {
    if (createdTranslationId) {
      await prismaTestClient.productTranslation.deleteMany({
        where: { id: createdTranslationId },
      });
    }

    // Guard against an unset id (e.g. `beforeAll`'s own create request
    // failing before assignment): an unguarded `{ productId: undefined }`
    // filter is dropped entirely by Prisma, which would delete every SKU
    // row in the database instead of doing nothing.
    if (ownedProductId) {
      await prismaTestClient.sKU.deleteMany({
        where: { productId: ownedProductId },
      });
      await prismaTestClient.product.deleteMany({
        where: { id: ownedProductId },
      });
    }

    await closeTestApp(app);
  });

  it("lets the owning seller create a translation, then read it back", async () => {
    const createResponse = await authed(app, sellerToken)
      .post("/product-translations")
      .send({
        name: "Sản phẩm E2E",
        description: "Mô tả sản phẩm phục vụ kiểm thử e2e.",
        languageId: LanguageId.VI,
        productId: ownedProductId,
      })
      .expect(200);

    const created = createResponse.body as { id: string; name: string };

    expect(created.id).toBeDefined();
    createdTranslationId = created.id;

    const readResponse = await authed(app, sellerToken)
      .get(`/product-translations/${created.id}`)
      .expect(200);

    expect((readResponse.body as { id: string }).id).toBe(created.id);
  });

  it("401s an unauthenticated create attempt", async () => {
    await request(app.getHttpServer())
      .post("/product-translations")
      .send({
        name: "Should not be created",
        description: "Unauthenticated attempt",
        languageId: LanguageId.EN,
        productId: ownedProductId,
      })
      .expect(401);
  });

  it("rejects an empty create body with field-level validation errors", async () => {
    const response = await authed(app, sellerToken)
      .post("/product-translations")
      .send({})
      .expect(400);

    const body = response.body as { details: { field: string }[] };

    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.some((detail) => detail.field === "name")).toBe(true);
  });
});
