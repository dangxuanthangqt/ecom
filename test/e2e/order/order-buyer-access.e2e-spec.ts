import request from "supertest";
import { v4 as uuidv4 } from "uuid";

import { OrderStatus } from "@/generated/prisma/client";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { prismaTestClient } from "../support/prisma-test-client";

import {
  cleanupOrderFixtures,
  createSellerWithProduct,
  placeOrder,
} from "./order-checkout.e2e-spec";

/** Advances a fresh order all the way to DELIVERED as its owning seller, so
 * the cancel-on-terminal-state case does not have to mutate a seeded order
 * (seeded orders are read-only for this phase). */
async function advanceToDelivered(
  app: TestApp,
  sellerToken: string,
  orderId: string,
): Promise<void> {
  const path = (status: OrderStatus) =>
    authed(app, sellerToken)
      .put(`/manage-order/orders/${orderId}/status`)
      .send({ status })
      .expect(200);

  await path(OrderStatus.PENDING_PICKUP);
  await path(OrderStatus.PENDING_DELIVERY);
  await path(OrderStatus.DELIVERED);
}

describe("buyer order access (GET/PUT /orders)", () => {
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

  it("lists only the caller's own orders", async () => {
    const seller = await createSellerWithProduct(app);
    const buyerA = await createTestUser({ role: "CLIENT" });
    const buyerB = await createTestUser({ role: "CLIENT" });
    const { accessToken: buyerAToken } = await loginAs(
      app,
      buyerA.email,
      buyerA.password,
    );
    const { accessToken: buyerBToken } = await loginAs(
      app,
      buyerB.email,
      buyerB.password,
    );

    createdProductIds.push(seller.productId);
    createdUserIds.push(seller.sellerId, buyerA.id, buyerB.id);

    const orderA = await placeOrder(app, buyerAToken, seller.skuId);
    const orderB = await placeOrder(app, buyerBToken, seller.skuId);

    createdOrderIds.push(orderA.id, orderB.id);

    const listResponse = await authed(app, buyerAToken)
      .get("/orders")
      .query({ pageSize: 50 })
      .expect(200);

    const ids = (listResponse.body as { data: { id: string }[] }).data.map(
      (order) => order.id,
    );

    expect(ids).toContain(orderA.id);
    expect(ids).not.toContain(orderB.id);
  });

  it("returns 200 for the caller's own order and 404 for another buyer's order", async () => {
    const seller = await createSellerWithProduct(app);
    const buyerA = await createTestUser({ role: "CLIENT" });
    const buyerB = await createTestUser({ role: "CLIENT" });
    const { accessToken: buyerAToken } = await loginAs(
      app,
      buyerA.email,
      buyerA.password,
    );
    const { accessToken: buyerBToken } = await loginAs(
      app,
      buyerB.email,
      buyerB.password,
    );

    createdProductIds.push(seller.productId);
    createdUserIds.push(seller.sellerId, buyerA.id, buyerB.id);

    const orderA = await placeOrder(app, buyerAToken, seller.skuId);

    createdOrderIds.push(orderA.id);

    await authed(app, buyerAToken).get(`/orders/${orderA.id}`).expect(200);

    // BR-O06: a foreign orderId resolves to 404, never a 403.
    await authed(app, buyerBToken).get(`/orders/${orderA.id}`).expect(404);
  });

  it("rejects every order route with no auth header", async () => {
    await request(app.getHttpServer()).get("/orders").expect(401);
    await request(app.getHttpServer()).get(`/orders/${uuidv4()}`).expect(401);
    await request(app.getHttpServer())
      .put(`/orders/${uuidv4()}/cancel`)
      .expect(401);
  });

  it("treats a malformed orderId as a validation error", async () => {
    const buyer = await createTestUser({ role: "CLIENT" });
    const { accessToken: buyerToken } = await loginAs(
      app,
      buyer.email,
      buyer.password,
    );

    createdUserIds.push(buyer.id);

    await authed(app, buyerToken).get("/orders/not-a-uuid").expect(400);
  });

  it("cancels a fresh pending order, restoring stock, and rejects a repeat cancel", async () => {
    const seller = await createSellerWithProduct(app, { stock: 10 });
    const buyer = await createTestUser({ role: "CLIENT" });
    const { accessToken: buyerToken } = await loginAs(
      app,
      buyer.email,
      buyer.password,
    );

    createdProductIds.push(seller.productId);
    createdUserIds.push(seller.sellerId, buyer.id);

    const order = await placeOrder(app, buyerToken, seller.skuId, 2);

    createdOrderIds.push(order.id);

    const cancelResponse = await authed(app, buyerToken)
      .put(`/orders/${order.id}/cancel`)
      .expect(200);

    expect((cancelResponse.body as { status: OrderStatus }).status).toBe(
      OrderStatus.CANCELLED,
    );

    const cancelledOrder = await prismaTestClient.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true },
    });

    expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);

    const sku = await prismaTestClient.sKU.findUniqueOrThrow({
      where: { id: seller.skuId },
      select: { stock: true },
    });

    expect(sku.stock).toBe(seller.stock);

    // A second cancel on an already-cancelled (terminal) order is rejected.
    await authed(app, buyerToken).put(`/orders/${order.id}/cancel`).expect(400);
  });

  it("rejects cancelling an order that reached a terminal, non-cancellable state", async () => {
    const seller = await createSellerWithProduct(app);
    const buyer = await createTestUser({ role: "CLIENT" });
    const { accessToken: buyerToken } = await loginAs(
      app,
      buyer.email,
      buyer.password,
    );

    createdProductIds.push(seller.productId);
    createdUserIds.push(seller.sellerId, buyer.id);

    const order = await placeOrder(app, buyerToken, seller.skuId);

    createdOrderIds.push(order.id);

    await advanceToDelivered(app, seller.sellerToken, order.id);

    await authed(app, buyerToken).put(`/orders/${order.id}/cancel`).expect(400);
  });
});
