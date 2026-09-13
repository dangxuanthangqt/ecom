import { OrderStatus } from "@prisma/client";
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
 * A fresh seller with a fresh product/SKU, created through the real
 * `manage-product` HTTP routes rather than seeded/inserted directly — per
 * the phase plan, the fixture chain itself must be real, and the seeded
 * hero SKUs must never be ordered (their stock is shared with every other
 * spec run in the same band).
 */
export interface SellerFixture {
  sellerId: string;
  sellerToken: string;
  productId: string;
  skuId: string;
  price: number;
  stock: number;
}

export async function createSellerWithProduct(
  app: TestApp,
  overrides?: { price?: number; stock?: number },
): Promise<SellerFixture> {
  const seller = await createTestUser({ role: "SELLER" });
  const { accessToken: sellerToken } = await loginAs(
    app,
    seller.email,
    seller.password,
  );
  const price = overrides?.price ?? 150_000;
  const stock = overrides?.stock ?? 50;
  const suffix = uuidv4().slice(0, 8);

  const response = await authed(app, sellerToken)
    .post("/manage-product/products")
    .send({
      name: `E2E Order Product ${suffix}`,
      basePrice: price,
      virtualPrice: price,
      images: ["https://example.com/e2e-order-product.jpg"],
      brandId: BrandId.APPLE,
      categoryIds: [CategoryId.ELECTRONICS],
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
      variants: [{ value: "Type", options: ["Standard"] }],
      skus: [
        {
          value: "standard",
          price,
          stock,
          image: "https://example.com/e2e-order-sku.jpg",
        },
      ],
    })
    .expect(200);

  const body = response.body as { id: string; skus: { id: string }[] };

  return {
    sellerId: seller.id,
    sellerToken,
    productId: body.id,
    skuId: body.skus[0].id,
    price,
    stock,
  };
}

export async function addToCart(
  app: TestApp,
  buyerToken: string,
  skuId: string,
  quantity = 1,
): Promise<string> {
  const response = await authed(app, buyerToken)
    .post("/cart")
    .send({ skuId, quantity })
    .expect(200);

  return (response.body as { id: string }).id;
}

export interface PlacedOrder {
  id: string;
  status: OrderStatus;
  items: { id: string; skuValue: string; price: number; quantity: number }[];
}

/**
 * File-local helper, owned here and exported for the other three order
 * specs (per the phase plan) — builds the cart line and checks it out in
 * one call so every downstream spec gets a real, freshly-created order
 * without depending on cart e2e specs running first.
 */
export async function placeOrder(
  app: TestApp,
  buyerToken: string,
  skuId: string,
  quantity = 1,
): Promise<PlacedOrder> {
  const cartItemId = await addToCart(app, buyerToken, skuId, quantity);

  const response = await authed(app, buyerToken)
    .post("/orders")
    .send({ cartItemIds: [cartItemId] })
    .expect(200);

  const orders = response.body as PlacedOrder[];

  return orders[0];
}

/**
 * Best-effort teardown for everything a spec created through the helpers
 * above: order → its snapshot lines → leftover cart lines → product (which
 * cascades its SKUs) → the actor accounts themselves. Order matters — a
 * product cannot be deleted while a cart line still references one of its
 * SKUs (`CartItem.sku` has no cascade).
 */
export async function cleanupOrderFixtures({
  orderIds = [],
  productIds = [],
  userIds = [],
}: {
  orderIds?: string[];
  productIds?: string[];
  userIds?: string[];
}): Promise<void> {
  if (orderIds.length > 0) {
    await prismaTestClient.productSKUSnapshot.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prismaTestClient.order.deleteMany({
      where: { id: { in: orderIds } },
    });
  }

  if (userIds.length > 0) {
    await prismaTestClient.cartItem.deleteMany({
      where: { userId: { in: userIds } },
    });
  }

  if (productIds.length > 0) {
    await prismaTestClient.product.deleteMany({
      where: { id: { in: productIds } },
    });
  }

  if (userIds.length > 0) {
    await prismaTestClient.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

describe("order checkout (POST /orders)", () => {
  let app: TestApp;
  const createdOrderIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanupOrderFixtures({
      orderIds: createdOrderIds,
      productIds: createdProductIds,
      userIds: createdUserIds,
    });
    await closeTestApp(app);
  });

  it("checks out the cart: decrements stock, freezes a snapshot and empties the cart", async () => {
    const seller = await createSellerWithProduct(app, {
      price: 200_000,
      stock: 20,
    });
    const buyer = await createTestUser({ role: "CLIENT" });
    const { accessToken: buyerToken } = await loginAs(
      app,
      buyer.email,
      buyer.password,
    );

    createdProductIds.push(seller.productId);
    createdUserIds.push(seller.sellerId, buyer.id);

    const quantity = 3;
    const cartItemId = await addToCart(app, buyerToken, seller.skuId, quantity);

    const checkoutResponse = await authed(app, buyerToken)
      .post("/orders")
      .send({ cartItemIds: [cartItemId] })
      .expect(200);

    const orders = checkoutResponse.body as PlacedOrder[];

    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe(OrderStatus.PENDING_CONFIRMATION);
    createdOrderIds.push(orders[0].id);

    // Observation 1 — the cart is empty.
    const cartResponse = await authed(app, buyerToken).get("/cart").expect(200);

    expect((cartResponse.body as { data: unknown[] }).data).toHaveLength(0);

    // Observation 2 — SKU stock decreased by the ordered quantity.
    const sku = await prismaTestClient.sKU.findUniqueOrThrow({
      where: { id: seller.skuId },
      select: { stock: true },
    });

    expect(sku.stock).toBe(seller.stock - quantity);

    // Observation 3 — a ProductSKUSnapshot row froze the price/name at
    // purchase time (BR-O03), invisible to a status-code-only assertion.
    const snapshots = await prismaTestClient.productSKUSnapshot.findMany({
      where: { orderId: orders[0].id },
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      price: seller.price,
      skuValue: "standard",
      quantity,
      skuId: seller.skuId,
    });
  });

  it("rejects checkout with no auth header", async () => {
    await request(app.getHttpServer())
      .post("/orders")
      .send({ cartItemIds: [uuidv4()] })
      .expect(401);
  });

  it("rejects an empty cartItemIds array as a validation error", async () => {
    const buyer = await createTestUser({ role: "CLIENT" });
    const { accessToken: buyerToken } = await loginAs(
      app,
      buyer.email,
      buyer.password,
    );

    createdUserIds.push(buyer.id);

    await authed(app, buyerToken)
      .post("/orders")
      .send({ cartItemIds: [] })
      .expect(400);
  });

  it("rejects checkout with a cart item id the caller does not own", async () => {
    const buyer = await createTestUser({ role: "CLIENT" });
    const { accessToken: buyerToken } = await loginAs(
      app,
      buyer.email,
      buyer.password,
    );

    createdUserIds.push(buyer.id);

    await authed(app, buyerToken)
      .post("/orders")
      .send({ cartItemIds: [uuidv4()] })
      .expect(404);
  });
});
