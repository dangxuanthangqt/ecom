import { Type } from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/constants";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";

import {
  AUTHORIZATION_HEADER_KEY,
  AuthorizationHeaderMetadata,
  AuthorizationType,
} from "@/constants/auth.constant";
import { PermissionKey } from "@/constants/permission.constant";
import { PERMISSION_KEY } from "@/shared/param-decorators/require-permission.decorator";

export type RoutePermissionEntry = {
  controller: string;
  handler: string;
  /** Present when the handler carries `@RequirePermission`. */
  key?: PermissionKey;
  /** True when `@IsPublicApi()` (or an equivalent `None`-only policy) applies. */
  isPublic: boolean;
  /**
   * True when the route's policy lists `None` next to another type. Under the
   * `OR` combinator a rejected Bearer token would fall through to `None` and
   * skip the permission check entirely, so this shape is refused at boot.
   */
  mixesPublicWithAuth: boolean;
};

/**
 * Walks every registered controller and reports, per route handler, which
 * permission it declares and whether it is public. The single source both the
 * boot-time coverage check and the catalogue sync read from, so the two can
 * never disagree about what a route requires.
 */
export const collectRoutePermissions = (
  discoveryService: DiscoveryService,
  metadataScanner: MetadataScanner,
  reflector: Reflector,
): RoutePermissionEntry[] => {
  const entries: RoutePermissionEntry[] = [];

  for (const wrapper of discoveryService.getControllers()) {
    const controllerClass = wrapper.metatype as Type<unknown> | undefined;

    if (!controllerClass) {
      continue;
    }

    const prototype = controllerClass.prototype as Record<string, unknown>;

    for (const methodName of metadataScanner.getAllMethodNames(prototype)) {
      const handler = prototype[methodName];

      if (typeof handler !== "function") {
        continue;
      }

      // Only methods Nest registered as routes carry PATH_METADATA; plain
      // helper methods on a controller do not and are skipped.
      if (Reflect.getMetadata(PATH_METADATA, handler) === undefined) {
        continue;
      }

      const key = reflector.getAllAndOverride<PermissionKey | undefined>(
        PERMISSION_KEY,
        [handler, controllerClass],
      );

      const authorization = reflector.getAllAndOverride<
        AuthorizationHeaderMetadata | undefined
      >(AUTHORIZATION_HEADER_KEY, [handler, controllerClass]);

      const types = authorization?.authorizationTypes ?? [];
      const hasNone = types.includes(AuthorizationType.NONE);
      const isPublic = hasNone && types.length === 1;

      entries.push({
        controller: controllerClass.name,
        handler: methodName,
        key,
        isPublic,
        mixesPublicWithAuth: hasNone && types.length > 1,
      });
    }
  }

  return entries;
};
