import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";

import {
  cleanupOrderFixtures,
  createSellerWithProduct,
  placeOrder,
} from "./order-checkout.e2e-spec";

describe("manage-order — role scope (CLIENT vs SELLER vs ADMIN)", () => {
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

  it("returns 403 for a CLIENT token, with a SELLER token as the positive control", async () => {
    const client = await createTestUser({ role: "CLIENT" });
    const { accessToken: clientToken } = await loginAs(
      app,
      client.email,
      client.password,
    );
    const seller = await createSellerWithProduct(app);

    createdUserIds.push(client.id, seller.sellerId);
    createdProductIds.push(seller.productId);

    // CLIENT holds no MANAGE-ORDER permission — a real guard-level 403.
    await authed(app, clientToken).get("/manage-order/orders").expect(403);

    // SELLER does — proves the 403 above is role-scoped, not a broken route.
    await authed(app, seller.sellerToken)
      .get("/manage-order/orders")
      .expect(200);
  });

  it("gives admin visibility across sellers where a seller sees only its own", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const { accessToken: adminToken } = await loginAs(
      app,
      admin.email,
      admin.password,
    );

    const sellerA = await createSellerWithProduct(app);
    const sellerB = await createSellerWithProduct(app);
    const buyer = await createTestUser({ role: "CLIENT" });
    const { accessToken: buyerToken } = await loginAs(
      app,
      buyer.email,
      buyer.password,
    );

    createdUserIds.push(admin.id, sellerA.sellerId, sellerB.sellerId, buyer.id);
    createdProductIds.push(sellerA.productId, sellerB.productId);

    const orderA = await placeOrder(app, buyerToken, sellerA.skuId);
    const orderB = await placeOrder(app, buyerToken, sellerB.skuId);

    createdOrderIds.push(orderA.id, orderB.id);

    const adminList = await authed(app, adminToken)
      .get("/manage-order/orders")
      .query({ pageSize: 100 })
      .expect(200);

    const adminIds = (adminList.body as { data: { id: string }[] }).data.map(
      (row) => row.id,
    );

    expect(adminIds).toEqual(expect.arrayContaining([orderA.id, orderB.id]));

    const sellerAList = await authed(app, sellerA.sellerToken)
      .get("/manage-order/orders")
      .query({ pageSize: 100 })
      .expect(200);

    const sellerAIds = (
      sellerAList.body as { data: { id: string }[] }
    ).data.map((row) => row.id);

    expect(sellerAIds).toContain(orderA.id);
    expect(sellerAIds).not.toContain(orderB.id);

    // Admin also reaches an order by id regardless of which seller owns it.
    await authed(app, adminToken)
      .get(`/manage-order/orders/${orderB.id}`)
      .expect(200);
  });
});
