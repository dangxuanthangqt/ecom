import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { BrandId } from "../support/fixtures";

type Role = "ADMIN" | "SELLER" | "CLIENT";

/**
 * Pins the grant matrix (`RolePermissionMatrix`) to observable behaviour: for
 * each role, one route it must reach and one it must be refused. This is what
 * keeps the matrix from drifting — a change to a grant fails here before it
 * ships. Only status codes are asserted; the routes' own specs cover bodies.
 */
describe("Role × permission matrix", () => {
  let app: TestApp;
  const tokens = {} as Record<Role, string>;
  /** A second seller, to prove `own` scope cannot reach another seller's data. */
  let otherSellerId: string;
  let otherSellerToken: string;

  beforeAll(async () => {
    app = await createTestApp();

    for (const role of ["ADMIN", "SELLER", "CLIENT"] as Role[]) {
      const user = await createTestUser({ role });
      tokens[role] = (
        await loginAs(app, user.email, user.password)
      ).accessToken;
    }

    const otherSeller = await createTestUser({ role: "SELLER" });
    otherSellerId = otherSeller.id;
    otherSellerToken = (
      await loginAs(app, otherSeller.email, otherSeller.password)
    ).accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe("client", () => {
    it("reads reference data it needs to shop", async () => {
      await authed(app, tokens.CLIENT).get("/categories").expect(200);

      // `GET /brands/:id` answers 400, not 200: the handler declares
      // `@Param("id") param: BrandIdParamDto`, so the pipe validates the bare id
      // string against a DTO and always fails. That bug predates this refactor
      // and is out of its scope — what matters here is that the guard admitted
      // the request, which a 403 would disprove.
      const brand = await authed(app, tokens.CLIENT).get(
        `/brands/${BrandId.APPLE}`,
      );

      expect(brand.status).not.toBe(403);
    });

    it("cannot write brands or categories (the over-grant this refactor closed)", async () => {
      await authed(app, tokens.CLIENT).post("/brands").send({}).expect(403);
      await authed(app, tokens.CLIENT)
        .delete(`/brands/${BrandId.APPLE}`)
        .expect(403);
      await authed(app, tokens.CLIENT).post("/categories").send({}).expect(403);
    });

    it("cannot touch product translations", async () => {
      await authed(app, tokens.CLIENT).get("/product-translations").expect(403);
    });

    it("cannot delete media", async () => {
      await authed(app, tokens.CLIENT)
        .delete("/media/delete?key=anything.jpg")
        .expect(403);
    });

    it("cannot manage products or fulfil orders", async () => {
      await authed(app, tokens.CLIENT)
        .get("/manage-product/products")
        .expect(403);
      await authed(app, tokens.CLIENT).get("/manage-order/orders").expect(403);
    });
  });

  describe("seller", () => {
    it("reads categories and is admitted to brands, which creating a product requires", async () => {
      await authed(app, tokens.SELLER).get("/categories").expect(200);

      // See the client case above for why this is 400 rather than 200.
      const brand = await authed(app, tokens.SELLER).get(
        `/brands/${BrandId.APPLE}`,
      );

      expect(brand.status).not.toBe(403);
    });

    it("manages its own products and fulfils orders", async () => {
      await authed(app, tokens.SELLER)
        .get("/manage-product/products")
        .expect(200);
      await authed(app, tokens.SELLER).get("/manage-order/orders").expect(200);
    });

    it("cannot write brands or delete media", async () => {
      await authed(app, tokens.SELLER).post("/brands").send({}).expect(403);
      await authed(app, tokens.SELLER)
        .delete("/media/delete?key=anything.jpg")
        .expect(403);
    });

    it("cannot manage users, roles or read the permission catalogue", async () => {
      await authed(app, tokens.SELLER).get("/users").expect(403);
      await authed(app, tokens.SELLER).get("/roles").expect(403);
      await authed(app, tokens.SELLER).get("/permissions").expect(403);
    });
  });

  describe("admin", () => {
    it("passes the guard on every admin-only surface", async () => {
      await authed(app, tokens.ADMIN).get("/users").expect(200);
      await authed(app, tokens.ADMIN).get("/roles").expect(200);
      await authed(app, tokens.ADMIN).get("/permissions").expect(200);
      await authed(app, tokens.ADMIN).get("/languages").expect(200);
    });

    it("is admitted to brand writes (400 here is validation, past the guard)", async () => {
      await authed(app, tokens.ADMIN).post("/brands").send({}).expect(400);
    });
  });

  describe("scope inside one route", () => {
    // `GET /manage-product/products` defaults its `createdById` filter to the
    // caller, so both roles see their own products unless they ask for someone
    // else's. Asking is exactly where `own` and `any` diverge.
    const otherSellersProducts = () =>
      `/manage-product/products?createdById=${otherSellerId}`;

    it("refuses a seller asking for another seller's products", async () => {
      await authed(app, tokens.SELLER).get(otherSellersProducts()).expect(403);
    });

    it("lets an admin ask for the same seller's products", async () => {
      await authed(app, tokens.ADMIN).get(otherSellersProducts()).expect(200);
    });

    it("lets that seller read its own products", async () => {
      await authed(app, otherSellerToken)
        .get("/manage-product/products")
        .expect(200);
    });
  });
});
