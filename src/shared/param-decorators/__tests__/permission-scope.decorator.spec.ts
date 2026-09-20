import { ExecutionContext } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";

import { REQUEST_GRANTED_PERMISSIONS_KEY } from "@/constants/auth.constant";
import {
  ActionType,
  PermissionKey,
  ResourceType,
} from "@/constants/permission.constant";

import { PermissionScope } from "../permission-scope.decorator";

/**
 * `createParamDecorator` stores the factory in route-args metadata; pulling it
 * back out is the documented way to unit-test a custom param decorator.
 */
const factoryOf = (data: [ResourceType, ActionType]) => {
  class Probe {
    handler(@PermissionScope(data) _scope: unknown) {}
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Probe,
    "handler",
  ) as Record<
    string,
    { factory: (d: unknown, c: ExecutionContext) => unknown }
  >;

  return Object.values(metadata)[0].factory;
};

const contextWith = (granted?: Set<PermissionKey>) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ [REQUEST_GRANTED_PERMISSIONS_KEY]: granted }),
    }),
  }) as unknown as ExecutionContext;

describe("@PermissionScope", () => {
  it("yields `any` when the caller holds the unrestricted form", () => {
    const factory = factoryOf(["product", "read"]);

    expect(
      factory(["product", "read"], contextWith(new Set(["product:read:any"]))),
    ).toBe("any");
  });

  it("yields `own` when the caller holds only the owner-limited form", () => {
    const factory = factoryOf(["product", "read"]);

    expect(
      factory(["product", "read"], contextWith(new Set(["product:read:own"]))),
    ).toBe("own");
  });

  it("yields `own` when the guard attached nothing, never widening by accident", () => {
    const factory = factoryOf(["product", "read"]);

    expect(factory(["product", "read"], contextWith(undefined))).toBe("own");
  });
});
