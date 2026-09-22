import request from "supertest";

import {
  authed,
  createTestUser,
  loginAs,
  TestUser,
} from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { UserId } from "../support/fixtures";
import { prismaTestClient } from "../support/prisma-test-client";

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  details: Array<{ field: string; code: string; message: string }>;
  requestId?: string;
}

/**
 * The valuable assertion here is the negative one: every non-admin caller is
 * turned away by the real `AccessTokenGuard` permission check on every
 * `users` route (`RolePermissionMatrix` in
 * `src/constants/role-permission-matrix.constant.ts` grants `user:*:any` to
 * ADMIN alone), plus
 * the validation and self-delete-guard edge cases the service itself owns.
 *
 * A same-file admin positive control proves the 403s come from the guard,
 * not from a broken route.
 */
describe("user admin access control", () => {
  let app: TestApp;
  let admin: TestUser;
  let client: TestUser;
  let seller: TestUser;
  let adminAccessToken: string;
  let clientAccessToken: string;
  let sellerAccessToken: string;
  const createdUserIds: string[] = [];

  // A syntactically valid UUID that never needs to resolve to a real row —
  // every negative case here is rejected by the guard before the `:id` param
  // pipe or the service ever runs.
  const PLACEHOLDER_ID = "11111111-1111-4111-8111-111111111111";

  beforeAll(async () => {
    app = await createTestApp();

    admin = await createTestUser({ role: "ADMIN" });
    client = await createTestUser({ role: "CLIENT" });
    seller = await createTestUser({ role: "SELLER" });
    createdUserIds.push(admin.id, client.id, seller.id);

    adminAccessToken = (await loginAs(app, admin.email, admin.password))
      .accessToken;
    clientAccessToken = (await loginAs(app, client.email, client.password))
      .accessToken;
    sellerAccessToken = (await loginAs(app, seller.email, seller.password))
      .accessToken;
  });

  afterAll(async () => {
    await prismaTestClient.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });

    const untouchedSeeds = await prismaTestClient.user.findMany({
      where: { id: { in: Object.values(UserId) } },
      select: { id: true, deletedAt: true },
    });

    for (const seed of untouchedSeeds) {
      if (seed.deletedAt !== null) {
        throw new Error(
          `Seeded UserId "${seed.id}" was left soft-deleted by this spec.`,
        );
      }
    }

    await closeTestApp(app);
  });

  const routes = [
    { method: "get" as const, path: "/users" },
    { method: "get" as const, path: `/users/${PLACEHOLDER_ID}` },
    { method: "post" as const, path: "/users" },
    { method: "put" as const, path: `/users/${PLACEHOLDER_ID}` },
    { method: "delete" as const, path: `/users/${PLACEHOLDER_ID}` },
  ];

  it("rejects every route with 401 when no Authorization header is sent", async () => {
    for (const route of routes) {
      const response = await request(app.getHttpServer())[route.method](
        route.path,
      );

      expect(response.status).toBe(401);
    }
  });

  it("rejects every route with 403 for a CLIENT token", async () => {
    const asClient = authed(app, clientAccessToken);

    for (const route of routes) {
      const response = await asClient[route.method](route.path);

      expect(response.status).toBe(403);
      expect((response.body as ErrorResponseBody).message).toBe(
        "You do not have permission to access this resource.",
      );
    }
  });

  it("rejects every route with 403 for a SELLER token", async () => {
    const asSeller = authed(app, sellerAccessToken);

    for (const route of routes) {
      const response = await asSeller[route.method](route.path);

      expect(response.status).toBe(403);
      expect((response.body as ErrorResponseBody).message).toBe(
        "You do not have permission to access this resource.",
      );
    }
  });

  it("positive control: the admin token succeeds on GET /users", async () => {
    const response = await authed(app, adminAccessToken).get("/users");

    expect(response.status).toBe(200);
  });

  it("rejects POST /users with a duplicate email", async () => {
    const response = await authed(app, adminAccessToken).post("/users").send({
      email: admin.email, // already exists
      password: "Password@123",
      name: "Duplicate Email",
      phoneNumber: "0922222222",
    });

    expect(response.status).toBe(422);
    expect((response.body as ErrorResponseBody).message).toBe(
      "Email is already exist.",
    );
  });

  it("rejects POST /users with an empty body, listing field paths", async () => {
    const response = await authed(app, adminAccessToken)
      .post("/users")
      .send({});

    const body = response.body as ErrorResponseBody;
    expect(response.status).toBe(400);
    // `message` stays a string whatever the failure is; the per-field breakdown
    // lives in `details`. See docs/error-handling.md.
    expect(typeof body.message).toBe("string");
    expect(body.error).toBe("VALIDATION_FAILED");

    const fieldsWithErrors = new Set(
      body.details.map((detail) => detail.field),
    );
    expect(fieldsWithErrors).toEqual(
      new Set(["email", "password", "name", "phoneNumber"]),
    );
  });

  it("rejects GET /users/:id with a malformed id", async () => {
    const response = await authed(app, adminAccessToken).get(
      "/users/not-a-uuid",
    );

    expect(response.status).toBe(400);
  });

  it("rejects an admin deleting their own account, and the admin can still authenticate afterwards", async () => {
    const response = await authed(app, adminAccessToken).delete(
      `/users/${admin.id}`,
    );

    expect(response.status).toBe(403);
    expect((response.body as ErrorResponseBody).message).toBe(
      "You cannot update your own user.",
    );

    // The account was never touched by the rejected attempt.
    await loginAs(app, admin.email, admin.password);
  });
});
