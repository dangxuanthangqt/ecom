import request from "supertest";

import { publishedProductWhere } from "@/constants/product-visibility.constant";
import { ProductId } from "@/seed/seed-ids";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { prismaTestClient } from "../support/prisma-test-client";

interface CartListBody {
  data: Array<{ id: string; quantity: number }>;
}

/**
 * Add -> list -> update -> remove, all as one freshly created client so the
 * seeded demo carts (phase 05's checkout fixtures) stay untouched. Every step
 * re-reads `GET /cart` to prove the mutation is visible through the same read
 * path a real client would use, and the final delete is corroborated directly
 * against Postgres, not just the response body.
 */
describe("cart lifecycle (own actor)", () => {
  let app: TestApp;
  let accessToken: string;
  let userId: string;
  let skuId: string;

  beforeAll(async () => {
    app = await createTestApp();

    const user = await createTestUser({ role: "CLIENT" });
    const login = await loginAs(app, user.email, user.password);

    accessToken = login.accessToken;
    userId = login.userId;

    const sku = await prismaTestClient.sKU.findFirstOrThrow({
      where: {
        deletedAt: null,
        product: { id: ProductId.IPHONE_15, ...publishedProductWhere() },
      },
      orderBy: { order: "asc" },
    });

    skuId = sku.id;
  });

  afterAll(async () => {
    await prismaTestClient.cartItem.deleteMany({ where: { userId } });
    await closeTestApp(app);
  });

  it("starts empty", async () => {
    const response = await authed(app, accessToken).get("/cart").expect(200);

    expect((response.body as CartListBody).data).toEqual([]);
  });

  it("adds a SKU to the cart", async () => {
    const response = await authed(app, accessToken)
      .post("/cart")
      .send({ skuId, quantity: 2 })
      .expect(200);

    expect(response.body).toMatchObject({
      quantity: 2,
      sku: { id: skuId },
    });
  });

  it("reflects the addition on a fresh read", async () => {
    const response = await authed(app, accessToken).get("/cart").expect(200);

    const body = response.body as CartListBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      quantity: 2,
      sku: { id: skuId },
    });
  });

  it("updates the quantity", async () => {
    const list = await authed(app, accessToken).get("/cart").expect(200);
    const cartItemId = (list.body as CartListBody).data[0].id;

    const response = await authed(app, accessToken)
      .put(`/cart/${cartItemId}`)
      .send({ quantity: 5 })
      .expect(200);

    expect(response.body).toMatchObject({ id: cartItemId, quantity: 5 });
  });

  it("reflects the update on a fresh read", async () => {
    const response = await authed(app, accessToken).get("/cart").expect(200);

    const body = response.body as CartListBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ quantity: 5 });
  });

  it("removes the cart line, confirmed against Postgres", async () => {
    const list = await authed(app, accessToken).get("/cart").expect(200);
    const cartItemId = (list.body as CartListBody).data[0].id;

    await authed(app, accessToken).delete(`/cart/${cartItemId}`).expect(200);

    const afterDelete = await authed(app, accessToken).get("/cart").expect(200);

    expect((afterDelete.body as CartListBody).data).toEqual([]);

    const row = await prismaTestClient.cartItem.findUnique({
      where: { id: cartItemId },
    });

    expect(row).toBeNull();
  });

  it("returns 401 without a token", async () => {
    await request(app.getHttpServer()).get("/cart").expect(401);
  });
});
