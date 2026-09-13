import request from "supertest";

import { publishedProductWhere } from "@/constants/product-visibility.constant";
import { ProductId, UserId } from "@/seed/seed-ids";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { prismaTestClient } from "../support/prisma-test-client";

/**
 * Every denial in this file is corroborated against Postgres, because a
 * response that merely omits a row still leaves open whether the write
 * happened. `clientB` operating on `clientA`'s cart item is the load-bearing
 * case: `PUT`/`DELETE` scope by `@ActiveUser("userId")` in the repository
 * layer, not the controller, so only a real HTTP round trip proves it holds.
 */
describe("cart access control", () => {
  let app: TestApp;
  let clientAToken: string;
  let clientAUserId: string;
  let clientBToken: string;
  let clientBUserId: string;
  let skuIds: string[];
  let seededClientCartCountBefore: number;

  beforeAll(async () => {
    app = await createTestApp();

    const [userA, userB] = await Promise.all([
      createTestUser({ role: "CLIENT" }),
      createTestUser({ role: "CLIENT" }),
    ]);

    const [loginA, loginB] = await Promise.all([
      loginAs(app, userA.email, userA.password),
      loginAs(app, userB.email, userB.password),
    ]);

    clientAToken = loginA.accessToken;
    clientAUserId = loginA.userId;
    clientBToken = loginB.accessToken;
    clientBUserId = loginB.userId;

    // Distinct addable SKUs across the hero products, so each scenario below
    // adds its own line and none interferes with another's stock ceiling.
    const skus = await prismaTestClient.sKU.findMany({
      where: {
        deletedAt: null,
        product: {
          id: {
            in: [
              ProductId.IPHONE_15,
              ProductId.GALAXY_S24,
              ProductId.MACBOOK_AIR,
              ProductId.AIR_MAX,
            ],
          },
          ...publishedProductWhere(),
        },
      },
      orderBy: { order: "asc" },
      distinct: ["productId"],
    });

    if (skus.length < 4) {
      throw new Error(
        "Expected at least 4 distinct addable SKUs from the hero products fixture.",
      );
    }

    skuIds = skus.map((sku) => sku.id);

    seededClientCartCountBefore = await prismaTestClient.cartItem.count({
      where: { userId: UserId.CLIENT },
    });
  });

  afterAll(async () => {
    await prismaTestClient.cartItem.deleteMany({
      where: { userId: { in: [clientAUserId, clientBUserId] } },
    });

    const seededClientCartCountAfter = await prismaTestClient.cartItem.count({
      where: { userId: UserId.CLIENT },
    });

    expect(seededClientCartCountAfter).toBe(seededClientCartCountBefore);

    await closeTestApp(app);
  });

  describe("anonymous access", () => {
    it("rejects GET /cart", async () => {
      await request(app.getHttpServer()).get("/cart").expect(401);
    });

    it("rejects POST /cart", async () => {
      await request(app.getHttpServer())
        .post("/cart")
        .send({ skuId: skuIds[0], quantity: 1 })
        .expect(401);
    });

    it("rejects PUT /cart/:cartItemId", async () => {
      await request(app.getHttpServer())
        .put("/cart/00000000-0000-4000-8000-000000000000")
        .send({ quantity: 1 })
        .expect(401);
    });

    it("rejects DELETE /cart/:cartItemId", async () => {
      await request(app.getHttpServer())
        .delete("/cart/00000000-0000-4000-8000-000000000000")
        .expect(401);
    });
  });

  describe("cross-user isolation", () => {
    let cartItemId: string;

    beforeAll(async () => {
      const response = await authed(app, clientAToken)
        .post("/cart")
        .send({ skuId: skuIds[0], quantity: 1 })
        .expect(200);

      cartItemId = (response.body as { id: string }).id;
    });

    it("denies clientB updating clientA's cart item, and the row survives untouched", async () => {
      const response = await authed(app, clientBToken)
        .put(`/cart/${cartItemId}`)
        .send({ quantity: 9 });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);

      const row = await prismaTestClient.cartItem.findUnique({
        where: { id: cartItemId },
      });

      expect(row).not.toBeNull();
      expect(row?.userId).toBe(clientAUserId);
      expect(row?.quantity).toBe(1);
    });

    it("denies clientB deleting clientA's cart item, and the row survives", async () => {
      const response = await authed(app, clientBToken).delete(
        `/cart/${cartItemId}`,
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);

      const row = await prismaTestClient.cartItem.findUnique({
        where: { id: cartItemId },
      });

      expect(row).not.toBeNull();
    });

    it("positive control: clientB succeeds on clientB's own item (isolation is not a blanket denial)", async () => {
      const created = await authed(app, clientBToken)
        .post("/cart")
        .send({ skuId: skuIds[1], quantity: 1 })
        .expect(200);

      const ownCartItemId = (created.body as { id: string }).id;

      await authed(app, clientBToken)
        .put(`/cart/${ownCartItemId}`)
        .send({ quantity: 3 })
        .expect(200);

      await authed(app, clientBToken)
        .delete(`/cart/${ownCartItemId}`)
        .expect(200);

      const row = await prismaTestClient.cartItem.findUnique({
        where: { id: ownCartItemId },
      });

      expect(row).toBeNull();
    });
  });

  describe("validation errors", () => {
    it("rejects quantity 0", async () => {
      await authed(app, clientAToken)
        .post("/cart")
        .send({ skuId: skuIds[2], quantity: 0 })
        .expect(400);
    });

    it("rejects a negative quantity", async () => {
      await authed(app, clientAToken)
        .post("/cart")
        .send({ skuId: skuIds[2], quantity: -1 })
        .expect(400);
    });

    it("rejects an unknown but well-formed skuId", async () => {
      await authed(app, clientAToken)
        .post("/cart")
        .send({ skuId: "00000000-0000-4000-8000-999999999999", quantity: 1 })
        .expect(404);
    });

    it("rejects a malformed cartItemId on PUT", async () => {
      await authed(app, clientAToken)
        .put("/cart/not-a-uuid")
        .send({ quantity: 1 })
        .expect(400);
    });
  });

  describe("stock boundary", () => {
    it("rejects adding more than the SKU's available stock", async () => {
      const sku = await prismaTestClient.sKU.findUniqueOrThrow({
        where: { id: skuIds[3] },
      });

      await authed(app, clientAToken)
        .post("/cart")
        .send({ skuId: sku.id, quantity: sku.stock + 1 })
        .expect(400);
    });
  });
});
