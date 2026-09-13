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
 * CRUD round-trip against `PermissionController`. Every permission created
 * here uses a made-up `path` (`/e2e-test-permission-*`) that no real route
 * matches, so `syncRoutePermissions` (which re-derives the ADMIN/CLIENT/SELLER
 * grants from the live router) never touches it and it can never collide with
 * a permission row a real route depends on.
 *
 * `PermissionService.createPermission`/`deletePermission` invalidate the
 * whole `RolePermissionCacheService` cache (see `docs/e2e-testing.md` §
 * "What is not covered"), which is safe here: invalidation only forces the
 * next request to fall back to Postgres, it never corrupts another spec's
 * assertions, and `--runInBand` means no other spec's request is in flight
 * while this one mutates.
 */
describe("Permission CRUD (F###)", () => {
  let app: TestApp;
  let adminToken: string;
  const createdPermissionIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const admin = await createTestUser({ role: "ADMIN" });
    const login = await loginAs(app, admin.email, admin.password);
    adminToken = login.accessToken;
  });

  afterAll(async () => {
    if (createdPermissionIds.length > 0) {
      await prismaTestClient.permission.deleteMany({
        where: { id: { in: createdPermissionIds } },
      });
    }

    await closeTestApp(app);
  });

  it("round-trips create -> read -> update -> list -> delete -> 404", async () => {
    const client = authed(app, adminToken);
    const suffix = uuidv4().slice(0, 8);
    const path = `/e2e-test-permission-${suffix}`;
    const name = `E2E Permission ${suffix}`;

    const createResponse = await client
      .post("/permissions")
      .send({ name, path, method: "GET" })
      .expect(200);

    const created = createResponse.body as { id: string; name: string };

    expect(created.id).toBeDefined();
    expect(created.name).toBe(name);
    createdPermissionIds.push(created.id);

    const readResponse = await client
      .get(`/permissions/${created.id}`)
      .expect(200);

    expect((readResponse.body as { name: string }).name).toBe(name);

    const updatedName = `${name} (updated)`;

    await client
      .put(`/permissions/${created.id}`)
      .send({ name: updatedName, path, method: "GET" })
      .expect(200);

    const readAfterUpdate = await client
      .get(`/permissions/${created.id}`)
      .expect(200);

    expect((readAfterUpdate.body as { name: string }).name).toBe(updatedName);

    // `getPermissions` has no `keyword` filter (unlike brand/category
    // translations), and the default page (pageSize 10, oldest first) would
    // otherwise never contain a row created after the ~85 route-derived
    // fixtures — order newest-first instead.
    const listResponse = await client
      .get("/permissions?order=desc&pageSize=50")
      .expect(200);
    const list = listResponse.body as { data: { id: string }[] };

    expect(list.data.some((permission) => permission.id === created.id)).toBe(
      true,
    );

    await client.delete(`/permissions/${created.id}`).send({}).expect(200);

    await client.get(`/permissions/${created.id}`).expect(404);

    createdPermissionIds.length = 0;
  });

  it("rejects every route without a token", async () => {
    await request(app.getHttpServer()).get("/permissions").expect(401);
  });
});
