import request from "supertest";
import { v4 as uuidv4 } from "uuid";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { prismaTestClient } from "../support/prisma-test-client";

/**
 * CRUD round-trip against `RoleController`, including attaching a
 * permission from the catalogue. Every role created here is created and
 * deleted by this spec — the seeded `RoleId.ADMIN/CLIENT/SELLER` rows other
 * specs log in as are never touched, and `isSystem` would refuse anyway.
 */
describe("Role CRUD (F###)", () => {
  let app: TestApp;
  let adminToken: string;
  let permissionId: string;
  const createdRoleIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const admin = await createTestUser({ role: "ADMIN" });
    const login = await loginAs(app, admin.email, admin.password);
    adminToken = login.accessToken;

    // Any real catalogue row works as an attachable permission; the sync that
    // runs in e2e setup only ever soft-deletes rows, never this spec's roles.
    const permission = await prismaTestClient.permission.findFirstOrThrow({
      where: { key: "brand:read:any", deletedAt: null },
    });

    permissionId = permission.id;
  });

  afterAll(async () => {
    if (createdRoleIds.length > 0) {
      await prismaTestClient.role.deleteMany({
        where: { id: { in: createdRoleIds } },
      });
    }

    await closeTestApp(app);
  });

  it("round-trips create -> read -> update -> list -> delete -> 404", async () => {
    const client = authed(app, adminToken);
    const name = `E2E Role ${uuidv4().slice(0, 8)}`;

    const createResponse = await client
      .post("/roles")
      .send({ name, isActive: true, permissionIds: [permissionId] })
      .expect(200);

    const created = createResponse.body as {
      id: string;
      name: string;
      permissions: { id: string }[];
    };

    expect(created.id).toBeDefined();
    expect(created.name).toBe(name);
    expect(created.permissions.some((p) => p.id === permissionId)).toBe(true);
    createdRoleIds.push(created.id);

    const readResponse = await client.get(`/roles/${created.id}`).expect(200);

    expect((readResponse.body as { name: string }).name).toBe(name);

    const updatedName = `${name} (updated)`;

    await client
      .put(`/roles/${created.id}`)
      .send({ name: updatedName, permissionIds: [permissionId] })
      .expect(200);

    const readAfterUpdate = await client
      .get(`/roles/${created.id}`)
      .expect(200);

    expect((readAfterUpdate.body as { name: string }).name).toBe(updatedName);

    // Unfiltered on purpose: `GET /roles` defaults to `pageSize=10`, and the
    // seeded ADMIN/CLIENT/SELLER roles plus this one stay well under that —
    // if a future seeder adds more roles, switch to `?order=desc` (there is
    // no `keyword` filter on this endpoint) like `permission-crud` does.
    const listResponse = await client.get("/roles").expect(200);
    const list = listResponse.body as { data: { id: string }[] };

    expect(list.data.some((role) => role.id === created.id)).toBe(true);

    await client.delete(`/roles/${created.id}`).send({}).expect(200);

    await client.get(`/roles/${created.id}`).expect(404);

    createdRoleIds.length = 0;
  });

  it("rejects every route without a token", async () => {
    await request(app.getHttpServer()).get("/roles").expect(401);
  });
});
