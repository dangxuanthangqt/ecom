import { Injectable, Logger } from "@nestjs/common";

import { PermissionKey } from "@/constants/permission.constant";

import { RedisService } from "./redis.service";

const CACHE_PREFIX = "role-permission";
const CACHE_TTL_SECONDS = 300;
const SCAN_COUNT = 100;

/**
 * Caches one role's full permission-key list under a single Redis key, so the
 * guard pays one GET per request and the cache holds as many keys as there are
 * roles — not roles × routes, as the old per-route cache did.
 *
 * Every read/write fails open (null / no-op) on a Redis error: an outage
 * degrades to "always hit Postgres", never to "nobody can log in".
 */
@Injectable()
export class RolePermissionCacheService {
  private readonly logger = new Logger(RolePermissionCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  private buildKey(roleId: string): string {
    return `${CACHE_PREFIX}:${roleId}`;
  }

  async getRoleKeys(roleId: string): Promise<PermissionKey[] | null> {
    try {
      const raw = await this.redisService.client.get(this.buildKey(roleId));

      return raw ? (JSON.parse(raw) as PermissionKey[]) : null;
    } catch (error) {
      this.logger.error(
        `Failed to read role-permission cache: ${(error as Error).message}`,
      );

      return null;
    }
  }

  async setRoleKeys(roleId: string, keys: PermissionKey[]): Promise<void> {
    try {
      await this.redisService.client.set(
        this.buildKey(roleId),
        JSON.stringify(keys),
        "EX",
        CACHE_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.error(
        `Failed to write role-permission cache: ${(error as Error).message}`,
      );
    }
  }

  /** Drops one role's cached set. One key, so no scan is needed. */
  async invalidateRole(roleId: string): Promise<void> {
    try {
      await this.redisService.client.del(this.buildKey(roleId));
    } catch (error) {
      this.logger.error(
        `Failed to invalidate role-permission cache (${roleId}): ${(error as Error).message}`,
      );
    }
  }

  /** Drops every role's cached set — used when the permission catalogue itself changes. */
  async invalidateAll(): Promise<void> {
    try {
      const keysToDelete: string[] = [];
      let cursor = "0";

      do {
        const [nextCursor, keys] = await this.redisService.client.scan(
          cursor,
          "MATCH",
          `${CACHE_PREFIX}:*`,
          "COUNT",
          SCAN_COUNT,
        );

        cursor = nextCursor;
        keysToDelete.push(...keys);
      } while (cursor !== "0");

      if (keysToDelete.length > 0) {
        await this.redisService.client.del(...keysToDelete);
      }
    } catch (error) {
      this.logger.error(
        `Failed to invalidate role-permission cache: ${(error as Error).message}`,
      );
    }
  }
}
