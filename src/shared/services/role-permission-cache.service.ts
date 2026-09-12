import { Injectable, Logger } from "@nestjs/common";

import { RedisService } from "./redis.service";

const CACHE_PREFIX = "role-permission";
const CACHE_TTL_SECONDS = 300;
const SCAN_COUNT = 100;

/**
 * Caches the auth guard's per-route role/permission lookup in Redis so it
 * does not hit Postgres on every authenticated request. Every read/write is
 * wrapped to fail open (return null / no-op) on a Redis error, so a cache
 * outage degrades to "always hit the DB" rather than breaking auth.
 */
@Injectable()
export class RolePermissionCacheService {
  private readonly logger = new Logger(RolePermissionCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  private buildKey(roleId: string, method: string, path: string): string {
    return `${CACHE_PREFIX}:${roleId}:${method}:${path}`;
  }

  async get<T>(
    roleId: string,
    method: string,
    path: string,
  ): Promise<T | null> {
    try {
      const raw = await this.redisService.client.get(
        this.buildKey(roleId, method, path),
      );

      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      this.logger.error(
        `Failed to read role-permission cache: ${(error as Error).message}`,
      );

      return null;
    }
  }

  async set(
    roleId: string,
    method: string,
    path: string,
    value: unknown,
  ): Promise<void> {
    try {
      await this.redisService.client.set(
        this.buildKey(roleId, method, path),
        JSON.stringify(value),
        "EX",
        CACHE_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.error(
        `Failed to write role-permission cache: ${(error as Error).message}`,
      );
    }
  }

  /** Invalidates every cached permission check for one role. */
  async invalidateRole(roleId: string): Promise<void> {
    await this.deleteByPattern(`${CACHE_PREFIX}:${roleId}:*`);
  }

  /**
   * Invalidates the entire role-permission cache. Used when a permission
   * mutation may affect roles other than the one directly edited.
   */
  async invalidateAll(): Promise<void> {
    await this.deleteByPattern(`${CACHE_PREFIX}:*`);
  }

  private async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];
      let cursor = "0";

      do {
        const [nextCursor, keys] = await this.redisService.client.scan(
          cursor,
          "MATCH",
          pattern,
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
        `Failed to invalidate role-permission cache (${pattern}): ${(error as Error).message}`,
      );
    }
  }
}
