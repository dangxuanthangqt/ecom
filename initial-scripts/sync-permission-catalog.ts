/* eslint-disable no-console */
import { INestApplication } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";

import {
  parsePermissionKey,
  PermissionKey,
} from "@/constants/permission.constant";
import { RolePermissionMatrix } from "@/constants/role-permission-matrix.constant";
import { Role, RoleType } from "@/constants/role.constant";
import { RolePermissionCacheService } from "@/shared/services/role-permission-cache.service";
import { collectRoutePermissions } from "@/shared/utils/collect-route-permissions.util";
import { withAnyCounterparts } from "@/shared/utils/permission.util";

/**
 * Makes the `Permission` table mirror what the controllers declare.
 *
 * Every distinct `@RequirePermission` key becomes (or stays) a row, and so does
 * the `any` form of every declared `own` key — handlers declare the minimum
 * they need, so `product:read:any` is never written on a handler yet must exist
 * to be granted to admin. A row whose key is implied by no handler any more is
 * soft-deleted. Grants are NOT touched —
 * that is `seedSystemRoleGrants`' job, and keeping the two apart is what lets an
 * operator's edits to a custom role survive a deploy.
 *
 * Needs an already-`init()`-ed Nest application: the declarations live on the
 * controller classes, which only the DI container knows about.
 */
export async function syncPermissionCatalog(
  app: INestApplication,
  prisma: PrismaClient,
): Promise<{ upserted: number; retired: number }> {
  const entries = collectRoutePermissions(
    app.get(DiscoveryService),
    app.get(MetadataScanner),
    app.get(Reflector),
  );

  const declaredKeys = withAnyCounterparts(
    entries
      .map((entry) => entry.key)
      .filter((key): key is PermissionKey => key !== undefined),
  );

  for (const key of declaredKeys) {
    const { resource, action, scope } = parsePermissionKey(key);

    await prisma.permission.upsert({
      where: { key },
      create: { key, resource, action, scope },
      // A key that was retired and later declared again comes back to life.
      update: { resource, action, scope, deletedAt: null, deletedById: null },
    });
  }

  const retired = await prisma.permission.updateMany({
    where: { key: { notIn: declaredKeys }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  console.log(
    `Permission catalogue: ${declaredKeys.length} keys upserted, ${retired.count} retired`,
  );

  return { upserted: declaredKeys.length, retired: retired.count };
}

/**
 * Writes `RolePermissionMatrix` onto the three system roles, replacing whatever
 * grants they had. Custom roles are never touched.
 *
 * Idempotent, and meant to run on every seed: for `admin`, `client` and
 * `seller` the matrix in code is the source of truth and the database is a
 * copy. A matrix entry that names a key no route declares is reported rather
 * than silently skipped — it means the matrix and the controllers disagree.
 */
export async function seedSystemRoleGrants(
  prisma: PrismaClient,
  // Optional so the function stays usable from a bare Prisma script; when the
  // caller has a booted app it MUST pass the cache, or a narrowed grant keeps
  // being served from Redis for up to the TTL after deploy.
  cache?: Pick<RolePermissionCacheService, "invalidateAll">,
): Promise<void> {
  const catalogue = await prisma.permission.findMany({
    where: { deletedAt: null },
    select: { id: true, key: true },
  });
  const idByKey = new Map(catalogue.map((row) => [row.key, row.id]));

  for (const roleName of Object.values(Role) as RoleType[]) {
    const wanted = RolePermissionMatrix[roleName];
    const unknown = wanted.filter((key) => !idByKey.has(key));

    if (unknown.length > 0) {
      console.warn(
        `Role ${roleName}: ${unknown.length} matrix key(s) not declared by any route, skipped: ${unknown.join(", ")}`,
      );
    }

    const ids = wanted
      .map((key) => idByKey.get(key))
      .filter((id): id is string => id !== undefined)
      .map((id) => ({ id }));

    const role = await prisma.role.findFirstOrThrow({
      where: { name: roleName, deletedAt: null },
      select: { id: true },
    });

    await prisma.role.update({
      where: { id: role.id },
      data: { isSystem: true, permissions: { set: ids } },
    });

    console.log(`Role ${roleName}: ${ids.length} permissions granted`);
  }

  // Grants just changed for every system role; a warm cache would otherwise
  // keep answering with the old set for up to CACHE_TTL_SECONDS.
  await cache?.invalidateAll();
}
