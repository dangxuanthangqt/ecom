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
 * Ownership fence on `product-translations`: a translation belongs to whoever
 * owns the product it translates. Seller B must not be able to read, edit,
 * delete or create translations for seller A's product; admin (`:any`) may.
 * Every denial is a 404, never a 403 — the row's existence is not confirmed.
 *
 * Pinned because the pre-refactor code enforced nothing here: any signed-in
 * account could edit any translation.
 */
describe("Product-translation ownership (scope own vs any)", () => {
  let app: TestApp;
  let sellerAToken: string;
  let sellerBToken: string;
  let adminToken: string;
  let sellerAProductId: string;
  let sellerATranslationId: string;

  const translationBody = (productId: string) => ({
    name: `Bản dịch E2E ${uuidv4().slice(0, 8)}`,
    description: "Mô tả phục vụ kiểm thử phạm vi sở hữu.",
    languageId: LanguageId.VI,
    productId,
  });

  beforeAll(async () => {
    app = await createTestApp();

    const sellerA = await createTestUser({ role: "SELLER" });
    const sellerB = await createTestUser({ role: "SELLER" });
    const admin = await createTestUser({ role: "ADMIN" });

    sellerAToken = (await loginAs(app, sellerA.email, sellerA.password))
      .accessToken;
    sellerBToken = (await loginAs(app, sellerB.email, sellerB.password))
      .accessToken;
    adminToken = (await loginAs(app, admin.email, admin.password)).accessToken;

    const product = await authed(app, sellerAToken)
      .post("/manage-product/products")
      .send({
        name: `E2E Ownership Host Product ${uuidv4().slice(0, 8)}`,
        basePrice: 200_000,
        virtualPrice: 180_000,
        images: ["https://example.com/e2e-ownership-product.jpg"],
        brandId: BrandId.APPLE,
        categoryIds: [CategoryId.ELECTRONICS],
        variants: [{ value: "Color", options: ["Black"] }],
        skus: [
          {
            value: "Black",
            price: 200_000,
            stock: 5,
            image: "https://example.com/e2e-ownership-sku.jpg",
          },
        ],
      })
      .expect(200);

    sellerAProductId = (product.body as { id: string }).id;

    const translation = await authed(app, sellerAToken)
      .post("/product-translations")
      .send(translationBody(sellerAProductId))
      .expect(200);

    sellerATranslationId = (translation.body as { id: string }).id;
  });

  afterAll(async () => {
    if (sellerAProductId) {
      await prismaTestClient.productTranslation.deleteMany({
        where: { productId: sellerAProductId },
      });
      await prismaTestClient.product.deleteMany({
        where: { id: sellerAProductId },
      });
    }

    await closeTestApp(app);
  });

  it("positive control: seller A reads its own translation", async () => {
    await authed(app, sellerAToken)
      .get(`/product-translations/${sellerATranslationId}`)
      .expect(200);
  });

  it("hides seller A's translation from seller B on read (404, not 403)", async () => {
    await authed(app, sellerBToken)
      .get(`/product-translations/${sellerATranslationId}`)
      .expect(404);
  });

  it("does not list seller A's translation to seller B", async () => {
    const response = await authed(app, sellerBToken)
      .get("/product-translations?pageSize=100")
      .expect(200);

    const ids = (response.body as { data: { id: string }[] }).data.map(
      (row) => row.id,
    );

    expect(ids).not.toContain(sellerATranslationId);
  });

  it("refuses seller B updating seller A's translation, and the row is unchanged", async () => {
    await authed(app, sellerBToken)
      .put(`/product-translations/${sellerATranslationId}`)
      .send({ name: "Hijacked" })
      .expect(404);

    const row = await prismaTestClient.productTranslation.findUniqueOrThrow({
      where: { id: sellerATranslationId },
    });

    expect(row.name).not.toBe("Hijacked");
  });

  it("refuses seller B deleting seller A's translation, and the row still exists", async () => {
    await authed(app, sellerBToken)
      .delete(`/product-translations/${sellerATranslationId}`)
      .expect(404);

    const row = await prismaTestClient.productTranslation.findUnique({
      where: { id: sellerATranslationId },
    });

    expect(row?.deletedAt).toBeNull();
  });

  it("refuses seller B creating a translation for seller A's product", async () => {
    await authed(app, sellerBToken)
      .post("/product-translations")
      .send(translationBody(sellerAProductId))
      .expect(404);
  });

  it("lets admin (scope any) read seller A's translation", async () => {
    await authed(app, adminToken)
      .get(`/product-translations/${sellerATranslationId}`)
      .expect(200);
  });
});
