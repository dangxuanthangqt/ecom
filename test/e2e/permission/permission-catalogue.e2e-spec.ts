import request from "supertest";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";

interface PermissionRow {
  id: string;
  key: string;
  resource: string;
  action: string;
  scope: string;
  roles?: { name: string }[];
}

/**
 * The permission catalogue is read-only over HTTP: rows come from
 * `@RequirePermission` declarations synced by `create-permission.ts`, which the
 * e2e setup runs. These specs prove the sync produced a catalogue the API can
 * read back, and that the write routes are gone.
 */
describe("Permission catalogue (read-only)", () => {
  let app: TestApp;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();

    const admin = await createTestUser({ role: "ADMIN" });
    adminToken = (await loginAs(app, admin.email, admin.password)).accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("lists catalogue rows shaped as resource:action:scope with their roles", async () => {
    const response = await authed(app, adminToken)
      .get("/permissions?pageSize=200")
      .expect(200);

    const { data } = response.body as { data: PermissionRow[] };

    expect(data.length).toBeGreaterThan(0);

    for (const row of data) {
      expect(row.key).toBe(`${row.resource}:${row.action}:${row.scope}`);
      expect(["own", "any"]).toContain(row.scope);
    }

    const brandCreate = data.find((row) => row.key === "brand:create:any");
    expect(brandCreate?.roles?.map((role) => role.name)).toEqual(["admin"]);
  });

  it("reads one row by id", async () => {
    const client = authed(app, adminToken);
    const list = (await client.get("/permissions?pageSize=1").expect(200))
      .body as { data: PermissionRow[] };
    const [first] = list.data;

    const one = (await client.get(`/permissions/${first.id}`).expect(200))
      .body as PermissionRow;

    expect(one.key).toBe(first.key);
  });

  it("404s an unknown id", async () => {
    await authed(app, adminToken)
      .get("/permissions/00000000-0000-4000-8000-000000000000")
      .expect(404);
  });

  it("has no write routes: the catalogue is owned by code", async () => {
    const client = authed(app, adminToken);

    await client
      .post("/permissions")
      .send({ key: "brand:create:any" })
      .expect(404);
    await client
      .put("/permissions/00000000-0000-4000-8000-000000000000")
      .send({})
      .expect(404);
    await client
      .delete("/permissions/00000000-0000-4000-8000-000000000000")
      .expect(404);
  });

  it("rejects every route without a token", async () => {
    await request(app.getHttpServer()).get("/permissions").expect(401);
  });

  it("is admin-only", async () => {
    const client = await createTestUser({ role: "CLIENT" });
    const clientToken = (await loginAs(app, client.email, client.password))
      .accessToken;

    await authed(app, clientToken).get("/permissions").expect(403);
  });
});
