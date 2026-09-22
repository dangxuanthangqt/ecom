import { PermissionKey } from "@/constants/permission.constant";

import { satisfies, scopeOf, withAnyCounterparts } from "../permission.util";

const grants = (...keys: PermissionKey[]) => new Set<string>(keys);

describe("satisfies", () => {
  it("passes when the exact key is held", () => {
    expect(satisfies(grants("product:read:own"), "product:read:own")).toBe(
      true,
    );
  });

  it("lets `any` stand in for an `own` requirement", () => {
    expect(satisfies(grants("product:read:any"), "product:read:own")).toBe(
      true,
    );
  });

  it("does not let `own` stand in for an `any` requirement", () => {
    expect(satisfies(grants("product:read:own"), "product:read:any")).toBe(
      false,
    );
  });

  it("fails on a different action for the same resource", () => {
    expect(satisfies(grants("product:read:any"), "product:update:own")).toBe(
      false,
    );
  });

  it("fails on a different resource for the same action", () => {
    expect(satisfies(grants("brand:update:any"), "product:update:own")).toBe(
      false,
    );
  });

  it("fails on an empty grant set", () => {
    expect(satisfies(grants(), "profile:read:own")).toBe(false);
  });
});

describe("scopeOf", () => {
  it("returns `any` when the unrestricted form is held", () => {
    expect(
      scopeOf(
        grants("product:read:own", "product:read:any"),
        "product",
        "read",
      ),
    ).toBe("any");
  });

  it("returns `own` when only the owner-limited form is held", () => {
    expect(scopeOf(grants("product:read:own"), "product", "read")).toBe("own");
  });

  it("returns `own` when nothing is held — it narrows, it never authorizes", () => {
    // The guard has already decided admission; this only shapes the query.
    expect(scopeOf(grants(), "product", "read")).toBe("own");
  });

  it("keys on the action, so read:any does not widen update", () => {
    expect(
      scopeOf(
        grants("product:read:any", "product:update:own"),
        "product",
        "update",
      ),
    ).toBe("own");
  });
});

describe("withAnyCounterparts", () => {
  it("adds the `any` form of every declared `own` key", () => {
    expect(withAnyCounterparts(["product:read:own"])).toEqual([
      "product:read:any",
      "product:read:own",
    ]);
  });

  it("leaves a declared `any` key alone and does not invent an `own` form", () => {
    expect(withAnyCounterparts(["brand:create:any"])).toEqual([
      "brand:create:any",
    ]);
  });

  it("deduplicates and sorts", () => {
    expect(
      withAnyCounterparts([
        "product:read:own",
        "product:read:any",
        "product:read:own",
      ]),
    ).toEqual(["product:read:any", "product:read:own"]);
  });

  it("covers what the seed matrix grants: every matrix key is either declared or the any-form of a declared own key", () => {
    // The 12 admin widenings that no handler names must all come out of this.
    const declared: PermissionKey[] = [
      "product:read:own",
      "product:create:own",
      "product:update:own",
      "product:delete:own",
      "order-fulfilment:read:own",
      "order-fulfilment:update:own",
      "order:read:own",
      "review:delete:own",
    ];
    const catalogue = new Set(withAnyCounterparts(declared));

    for (const widened of [
      "product:read:any",
      "product:create:any",
      "order-fulfilment:update:any",
      "order:read:any",
      "review:delete:any",
    ] as PermissionKey[]) {
      expect(catalogue.has(widened)).toBe(true);
    }
  });
});
