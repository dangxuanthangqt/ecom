import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { withAnyCounterparts } from "@/shared/utils/permission.util";

import { isPermissionKey, PermissionKey } from "../permission.constant";
import { RolePermissionMatrix } from "../role-permission-matrix.constant";
import { Role } from "../role.constant";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);

    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/** Every key written on a handler under src/routes, read straight from source. */
const declaredOnHandlers = (): Set<PermissionKey> => {
  const declared = new Set<PermissionKey>();
  const routesDir = join(__dirname, "..", "..", "routes");

  for (const file of walk(routesDir).filter((f) =>
    f.endsWith(".controller.ts"),
  )) {
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(/@RequirePermission\("([^"]+)"\)/g)) {
      const key = match[1];

      if (!isPermissionKey(key)) {
        throw new Error(`${file}: malformed permission key "${key}"`);
      }

      declared.add(key);
    }
  }

  return declared;
};

/**
 * Pins the two invariants that keep the grant matrix and the controllers in
 * step. Either drifting is a silent production bug: a route nobody can call, or
 * a grant that refers to a row the sync never creates (which is exactly how
 * admin would have ended up seeing only its own products).
 */
describe("RolePermissionMatrix ↔ handler declarations", () => {
  const declared = declaredOnHandlers();
  const catalogue = new Set(withAnyCounterparts(declared));
  const granted = new Set<PermissionKey>(
    Object.values(RolePermissionMatrix).flat(),
  );

  it("declares at least one permission on some handler", () => {
    expect(declared.size).toBeGreaterThan(0);
  });

  it("grants only keys the catalogue sync will actually create", () => {
    const missing = [...granted].filter((key) => !catalogue.has(key)).sort();

    expect(missing).toEqual([]);
  });

  it("grants every declared key to at least one role, so no route is unreachable", () => {
    const orphaned = [...declared].filter((key) => !granted.has(key)).sort();

    expect(orphaned).toEqual([]);
  });

  it("gives admin a superset of every other role", () => {
    const admin = new Set(RolePermissionMatrix[Role.ADMIN]);

    for (const role of [Role.SELLER, Role.CLIENT] as const) {
      const notInAdmin = RolePermissionMatrix[role].filter(
        (key) => !admin.has(key),
      );

      expect(notInAdmin).toEqual([]);
    }
  });

  it("never grants the client a write on reference data", () => {
    const clientWrites = RolePermissionMatrix[Role.CLIENT].filter((key) =>
      /^(brand|category|product-translation|language):(create|update|delete):/.test(
        key,
      ),
    );

    expect(clientWrites).toEqual([]);
  });

  it("does not let anyone but admin delete media until ownership is recorded", () => {
    for (const role of [Role.SELLER, Role.CLIENT] as const) {
      expect(RolePermissionMatrix[role]).not.toContain("media:delete:any");
      expect(RolePermissionMatrix[role]).not.toContain("media:delete:own");
    }
  });
});
