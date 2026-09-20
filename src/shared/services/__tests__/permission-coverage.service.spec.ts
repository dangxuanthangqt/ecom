import { Controller, Get, Post } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";

import {
  AuthorizationType,
  CombinedAuthorizationCondition,
} from "@/constants/auth.constant";
import {
  AuthApi,
  IsPublicApi,
} from "@/shared/param-decorators/auth-api.decorator";
import { RequirePermission } from "@/shared/param-decorators/require-permission.decorator";
import { collectRoutePermissions } from "@/shared/utils/collect-route-permissions.util";

import { PermissionCoverageService } from "../permission-coverage.service";

@Controller("covered")
class CoveredController {
  @RequirePermission("brand:read:any")
  @Get()
  list() {
    return [];
  }

  @IsPublicApi()
  @Get("open")
  open() {
    return [];
  }

  /** Not a route: must be ignored, not reported as uncovered. */
  helper() {
    return 1;
  }
}

@Controller("uncovered")
class UncoveredController {
  @Post()
  create() {
    return {};
  }
}

@Controller("mixed")
class MixedPolicyController {
  /** Bearer-or-None under OR: a bad token would fall through to None. */
  @AuthApi(
    [AuthorizationType.BEARER, AuthorizationType.NONE],
    CombinedAuthorizationCondition.OR,
  )
  @RequirePermission("brand:read:any")
  @Get()
  optionalAuth() {
    return [];
  }
}

const boot = async (controllers: unknown[]) => {
  const moduleRef = await Test.createTestingModule({
    controllers: controllers as never[],
    providers: [DiscoveryService, MetadataScanner, PermissionCoverageService],
  }).compile();

  return {
    service: moduleRef.get(PermissionCoverageService),
    discovery: moduleRef.get(DiscoveryService),
    scanner: moduleRef.get(MetadataScanner),
    reflector: moduleRef.get(Reflector),
  };
};

describe("collectRoutePermissions", () => {
  it("reports each route with its key or public flag, skipping non-route methods", async () => {
    const { discovery, scanner, reflector } = await boot([CoveredController]);

    const entries = collectRoutePermissions(discovery, scanner, reflector);

    expect(entries).toEqual([
      {
        controller: "CoveredController",
        handler: "list",
        key: "brand:read:any",
        isPublic: false,
        mixesPublicWithAuth: false,
      },
      {
        controller: "CoveredController",
        handler: "open",
        key: undefined,
        isPublic: true,
        mixesPublicWithAuth: false,
      },
    ]);
  });
});

describe("PermissionCoverageService - onApplicationBootstrap", () => {
  it("passes when every non-public route declares a permission", async () => {
    const { service } = await boot([CoveredController]);

    expect(() => service.onApplicationBootstrap()).not.toThrow();
  });

  it("refuses a policy that lists None beside another type, even with a key declared", async () => {
    // Under OR, an expired token throws inside AccessTokenGuard before the
    // permission check, the header guard swallows it and None lets the request
    // through — the declared key would never be enforced.
    const { service } = await boot([CoveredController, MixedPolicyController]);

    expect(() => service.onApplicationBootstrap()).toThrow(
      /MixedPolicyController\.optionalAuth mixes None with another authorization type/,
    );
  });

  it("refuses to start when a non-public route has no @RequirePermission", async () => {
    const { service } = await boot([CoveredController, UncoveredController]);

    expect(() => service.onApplicationBootstrap()).toThrow(
      /UncoveredController\.create has neither @RequirePermission nor @IsPublicApi/,
    );
  });
});
