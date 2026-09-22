import { Injectable } from "@nestjs/common";

import {
  isPermissionKey,
  PermissionKey,
} from "@/constants/permission.constant";
import { NOT_DELETED } from "@/constants/soft-delete.constant";

import { PrismaService } from "./prisma.service";
import { RolePermissionCacheService } from "./role-permission-cache.service";

/**
 * Answers "what may this caller do?" as a set of permission keys.
 *
 * Takes a list of role ids so a future many-roles-per-user schema is a
 * schema-only change: the effective set is the union across roles. Today every
 * user has exactly one.
 *
 * A role that is missing, soft-deleted or inactive resolves to an empty set,
 * which the guard turns into 403. A database failure is left to propagate —
 * that is a 500, and dressing it up as "forbidden" would hide an outage.
 */
@Injectable()
export class PermissionResolverService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly rolePermissionCacheService: RolePermissionCacheService,
  ) {}

  async forRoles(roleIds: string[]): Promise<Set<PermissionKey>> {
    const lists = await Promise.all(
      roleIds.map((roleId) => this.forRole(roleId)),
    );

    return new Set(lists.flat());
  }

  private async forRole(roleId: string): Promise<PermissionKey[]> {
    const cached = await this.rolePermissionCacheService.getRoleKeys(roleId);

    if (cached) {
      return cached;
    }

    const role = await this.prismaService.role.findUnique({
      where: { id: roleId, isActive: true, deletedAt: null },
      select: {
        permissions: { where: NOT_DELETED, select: { key: true } },
      },
    });

    // Rows are validated on the way in, so a malformed key here is corruption,
    // not input; dropping it is safer than granting something unparseable.
    const keys =
      role?.permissions
        .map((permission) => permission.key)
        .filter(isPermissionKey) ?? [];

    await this.rolePermissionCacheService.setRoleKeys(roleId, keys);

    return keys;
  }
}
