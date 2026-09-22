import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";

import { isPermissionKey } from "@/constants/permission.constant";
import { collectRoutePermissions } from "@/shared/utils/collect-route-permissions.util";

/**
 * Refuses to start the application while any non-public route lacks a
 * `@RequirePermission`. This turns deny-by-default from a convention into a
 * constraint: forgetting the decorator is a boot failure at deploy time, not
 * an endpoint whose access policy nobody can see.
 *
 * Assumes every controller is registered eagerly: `DiscoveryService` sees what
 * the DI container has instantiated by `onApplicationBootstrap`, so a controller
 * behind `LazyModuleLoader` would escape this check. None exist today; if one is
 * added, extend the check to run on lazy load. The guard itself still fails
 * closed (500) for an undeclared route, so the blind spot is loud, not silent.
 */
@Injectable()
export class PermissionCoverageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionCoverageService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onApplicationBootstrap(): void {
    const entries = collectRoutePermissions(
      this.discoveryService,
      this.metadataScanner,
      this.reflector,
    );

    const uncovered = entries.filter(
      (entry) => !entry.isPublic && entry.key === undefined,
    );

    const malformed = entries.filter(
      (entry) => entry.key !== undefined && !isPermissionKey(entry.key),
    );

    const mixed = entries.filter((entry) => entry.mixesPublicWithAuth);

    const problems = [
      ...uncovered.map(
        (entry) =>
          `${entry.controller}.${entry.handler} has neither @RequirePermission nor @IsPublicApi`,
      ),
      ...malformed.map(
        (entry) =>
          `${entry.controller}.${entry.handler} declares a malformed key "${String(entry.key)}"`,
      ),
      ...mixed.map(
        (entry) =>
          `${entry.controller}.${entry.handler} mixes None with another authorization type; use @IsPublicApi alone or drop None`,
      ),
    ];

    if (problems.length > 0) {
      throw new Error(
        `Permission coverage check failed for ${problems.length} route(s):\n  - ${problems.join("\n  - ")}`,
      );
    }

    const declared = new Set(entries.map((entry) => entry.key).filter(Boolean))
      .size;

    this.logger.log(
      `Permission coverage OK: ${entries.length} routes, ${declared} distinct permission keys`,
    );
  }
}
