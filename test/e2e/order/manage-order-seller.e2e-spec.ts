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

describe("manage-order — seller status transitions and scope", () => {
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

  it("lists an order placed against the seller's own product", async () => {
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

    const listResponse = await authed(app, seller.sellerToken)
      .get("/manage-order/orders")
      .query({ pageSize: 50 })
      .expect(200);

    const ids = (listResponse.body as { data: { id: string }[] }).data.map(
      (row) => row.id,
    );

    expect(ids).toContain(order.id);

    await authed(app, seller.sellerToken)
      .get(`/manage-order/orders/${order.id}`)
      .expect(200);
  });

  it("advances a legal transition, confirmed in Postgres", async () => {
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

    const updateResponse = await authed(app, seller.sellerToken)
      .put(`/manage-order/orders/${order.id}/status`)
      .send({ status: OrderStatus.PENDING_PICKUP })
      .expect(200);

    expect((updateResponse.body as { status: OrderStatus }).status).toBe(
      OrderStatus.PENDING_PICKUP,
    );

    const stored = await prismaTestClient.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true },
    });

    expect(stored.status).toBe(OrderStatus.PENDING_PICKUP);
  });

  it("rejects an illegal transition that skips a required step", async () => {
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

    // Still PENDING_CONFIRMATION — DELIVERED is not a legal next state.
    await authed(app, seller.sellerToken)
      .put(`/manage-order/orders/${order.id}/status`)
      .send({ status: OrderStatus.DELIVERED })
      .expect(400);
  });

  it("rejects a seller attempt to move an order to CANCELLED (buyer-only)", async () => {
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

    await authed(app, seller.sellerToken)
      .put(`/manage-order/orders/${order.id}/status`)
      .send({ status: OrderStatus.CANCELLED })
      .expect(400);
  });

  it("rejects an invalid enum value as a validation error", async () => {
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

    await authed(app, seller.sellerToken)
      .put(`/manage-order/orders/${order.id}/status`)
      .send({ status: "NOT_A_REAL_STATUS" })
      .expect(400);
  });

  it("hides another seller's order and rejects a cross-seller status update", async () => {
    const sellerA = await createSellerWithProduct(app);
    const sellerB = await createSellerWithProduct(app);
    const buyer = await createTestUser({ role: "CLIENT" });
    const { accessToken: buyerToken } = await loginAs(
      app,
      buyer.email,
      buyer.password,
    );

    createdProductIds.push(sellerA.productId, sellerB.productId);
    createdUserIds.push(sellerA.sellerId, sellerB.sellerId, buyer.id);

    const order = await placeOrder(app, buyerToken, sellerA.skuId);

    createdOrderIds.push(order.id);

    // BR-O06: a miss resolves to 404, never a 403.
    await authed(app, sellerB.sellerToken)
      .get(`/manage-order/orders/${order.id}`)
      .expect(404);

    await authed(app, sellerB.sellerToken)
      .put(`/manage-order/orders/${order.id}/status`)
      .send({ status: OrderStatus.PENDING_PICKUP })
      .expect(404);

    const listResponse = await authed(app, sellerB.sellerToken)
      .get("/manage-order/orders")
      .query({ pageSize: 50 })
      .expect(200);

    const ids = (listResponse.body as { data: { id: string }[] }).data.map(
      (row) => row.id,
    );

    expect(ids).not.toContain(order.id);

    const untouchedOrder = await prismaTestClient.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true },
    });

    expect(untouchedOrder.status).toBe(OrderStatus.PENDING_CONFIRMATION);
  });
});
