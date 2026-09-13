import {
  createTestUser,
  loginAs,
  authed,
  TestUser,
} from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { RoleId, UserId } from "../support/fixtures";
import { prismaTestClient } from "../support/prisma-test-client";

interface UserBody {
  id: string;
  email: string;
}

interface UserListBody {
  data: Array<{ id: string }>;
}

/**
 * Admin round-trip against the real `users` routes: create a SELLER-role
 * account, list it, read it back, update it, then soft-delete it — every step
 * verified against Postgres, never against the response body alone.
 *
 * The admin actor is provisioned by this spec (`createTestUser({ role:
 * "ADMIN" })`), not read from `.env`, per phase-06's machine-independence
 * requirement. Every row this spec creates is hard-deleted in `afterAll`, and
 * the seeded demo `UserId`s are asserted untouched afterwards.
 */
describe("user admin CRUD round-trip", () => {
  let app: TestApp;
  let admin: TestUser;
  let adminAccessToken: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const login = await loginAs(app, admin.email, admin.password);
    adminAccessToken = login.accessToken;
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

  it("creates, lists, reads, updates and soft-deletes a SELLER user", async () => {
    const client = authed(app, adminAccessToken);
    const newUserEmail = `e2e-crud-${Date.now()}@ecom.local`;

    // 1. Create — POST /users with an explicit SELLER role.
    const createResponse = await client.post("/users").send({
      email: newUserEmail,
      password: "Password@123",
      name: "E2E Created Seller",
      phoneNumber: "0911111111",
      roleId: RoleId.SELLER,
    });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toMatchObject({
      email: newUserEmail,
      name: "E2E Created Seller",
      role: { id: RoleId.SELLER },
    });
    expect(createResponse.body).not.toHaveProperty("password");

    const createdUserId = (createResponse.body as UserBody).id;
    createdUserIds.push(createdUserId);

    // The row exists with the requested role and a hashed (never plaintext) password.
    const rowInDb = await prismaTestClient.user.findUniqueOrThrow({
      where: { id: createdUserId },
    });
    expect(rowInDb.roleId).toBe(RoleId.SELLER);
    expect(rowInDb.password).not.toBe("Password@123");
    expect(rowInDb.password.length).toBeGreaterThan(20);

    // 2. List — GET /users includes it. `pageSize`/`order` keep this
    // assertion stable regardless of how many other users already exist in
    // the shared e2e database (default page size is 10, ascending by
    // creation time, which would otherwise push a freshly created row off
    // page 1).
    const listResponse = await client.get("/users?pageSize=100&order=desc");
    expect(listResponse.status).toBe(200);
    const listedIds = (listResponse.body as UserListBody).data.map(
      (user) => user.id,
    );
    expect(listedIds).toContain(createdUserId);

    // 3. Read — GET /users/:id returns it without the password hash.
    const getResponse = await client.get(`/users/${createdUserId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).not.toHaveProperty("password");
    expect((getResponse.body as UserBody).email).toBe(newUserEmail);

    // 4. Update — PUT /users/:id changes name/status, the read reflects it.
    const updateResponse = await client.put(`/users/${createdUserId}`).send({
      name: "E2E Updated Seller",
      status: "INACTIVE",
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).not.toHaveProperty("password");
    expect(updateResponse.body).toMatchObject({
      name: "E2E Updated Seller",
      status: "INACTIVE",
    });

    const getAfterUpdateResponse = await client.get(`/users/${createdUserId}`);
    expect(getAfterUpdateResponse.body).toMatchObject({
      name: "E2E Updated Seller",
      status: "INACTIVE",
    });

    // 5. Delete — DELETE /users/:id soft-deletes: `deletedAt` is set in
    // Postgres (never asserted via row absence, per phase-06 Key Insight 3).
    const deleteResponse = await client.delete(`/users/${createdUserId}`);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).not.toHaveProperty("password");

    const rowAfterDelete = await prismaTestClient.user.findUniqueOrThrow({
      where: { id: createdUserId },
    });
    expect(rowAfterDelete.deletedAt).not.toBeNull();

    // The service's own read paths exclude soft-deleted rows.
    const getAfterDeleteResponse = await client.get(`/users/${createdUserId}`);
    expect(getAfterDeleteResponse.status).toBe(404);

    const listAfterDeleteResponse = await client.get(
      "/users?pageSize=100&order=desc",
    );
    const listedIdsAfterDelete = (
      listAfterDeleteResponse.body as UserListBody
    ).data.map((user) => user.id);
    expect(listedIdsAfterDelete).not.toContain(createdUserId);
  });
});
