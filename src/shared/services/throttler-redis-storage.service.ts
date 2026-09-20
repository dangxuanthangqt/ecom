import { Injectable, Logger } from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";

import { RedisService } from "./redis.service";

/**
 * Structural copy of the package's `ThrottlerStorageRecord`, which its entry
 * point declares but does not re-export. Reaching into `dist/` for a type would
 * break on any internal reshuffle; this cannot.
 */
type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

const KEY_PREFIX = "throttle";

/**
 * How long a request will wait for the limiter before giving up on it.
 *
 * The shared client's own `commandTimeout` is 1000ms, sized for an optional
 * cache read on some requests. This guard now runs on *every* request, so a
 * Redis that is up but slow would add up to a second to every response in the
 * system. A local INCR answers in well under a millisecond; anything past this
 * deadline means Redis is unhealthy, and an unenforced limit for those seconds
 * is a smaller problem than an API-wide latency incident.
 */
const REDIS_DEADLINE_MS = 150;

/**
 * Counts hits in Redis so the limit is shared by every instance of the API.
 *
 * An in-memory counter would divide the real limit by the number of running
 * processes, which is the same as having no limit once the app is scaled: five
 * attempts per minute across four instances is twenty.
 *
 * Two keys per throttler back each caller:
 * - `<prefix>:<key>` holds the hit count and expires with the window;
 * - `<prefix>:<key>:blocked` exists only while the caller is locked out.
 *
 * The block key is what makes a lockout outlive its counting window: a limit of
 * five per minute with a five-minute block means the sixth attempt buys five
 * minutes of silence, not sixty seconds.
 */
const INCREMENT_SCRIPT = `
local hitsKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockPttl = redis.call('PTTL', blockKey)
if blockPttl > 0 then
  local blockedHits = tonumber(redis.call('GET', hitsKey)) or (limit + 1)
  local blockedTtl = redis.call('PTTL', hitsKey)
  if blockedTtl < 0 then blockedTtl = 0 end
  return {blockedHits, blockedTtl, 1, blockPttl}
end

-- A finished block can leave an over-limit counter behind. Starting it over
-- gives the caller a real second chance instead of re-blocking on contact.
local current = tonumber(redis.call('GET', hitsKey)) or 0
if current > limit then
  redis.call('DEL', hitsKey)
end

local hits = redis.call('INCR', hitsKey)
local pttl = redis.call('PTTL', hitsKey)
if pttl < 0 then
  redis.call('PEXPIRE', hitsKey, ttl)
  pttl = ttl
end

if hits > limit then
  redis.call('SET', blockKey, '1', 'PX', blockDuration)
  return {hits, pttl, 1, blockDuration}
end

return {hits, pttl, 0, 0}
`;

const isNoScriptError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes("NOSCRIPT");

/** The storage contract reports remaining time in whole seconds. */
const toSeconds = (milliseconds: number): number =>
  Math.ceil(milliseconds / 1000);

@Injectable()
export class ThrottlerRedisStorage implements ThrottlerStorage {
  private readonly logger = new Logger(ThrottlerRedisStorage.name);

  /** Set on first use so the script travels the wire once, not once per request. */
  private scriptSha?: string;

  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    // The braces are a Redis Cluster hash tag: they make the counter and its
    // block flag hash to one slot, so the script can touch both. Inert on a
    // standalone server, and free.
    const hitsKey = `${KEY_PREFIX}:${throttlerName}:{${key}}`;

    try {
      const [totalHits, timeToExpire, blocked, timeToBlockExpire] =
        await this.withDeadline(
          this.evaluate(
            [hitsKey, `${hitsKey}:blocked`],
            [String(ttl), String(limit), String(blockDuration)],
          ),
        );

      return {
        totalHits,
        timeToExpire: toSeconds(timeToExpire),
        isBlocked: blocked === 1,
        timeToBlockExpire: toSeconds(timeToBlockExpire),
      };
    } catch (error) {
      // Fail open. A rate limiter that takes the API down when its own backing
      // store blinks has traded a bounded risk for an unbounded one — the
      // attack this prevents is slow, an outage is immediate. The warning is
      // the signal that the limit is not being enforced right now.
      this.logger.warn(
        `Rate limit not enforced, Redis unavailable: ${(error as Error).message}`,
      );

      return {
        totalHits: 0,
        timeToExpire: toSeconds(ttl),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }

  /**
   * Bounds how long a caller waits on Redis. The operation is left running when
   * the deadline wins — its INCR either landed or did not, and either way the
   * next request re-reads the truth.
   */
  private async withDeadline<T>(operation: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    // Attaching a handler now marks a later rejection as handled, so losing the
    // race below cannot surface as an unhandled rejection.
    void operation.catch(() => undefined);

    try {
      return await Promise.race([
        operation,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(`Redis did not answer within ${REDIS_DEADLINE_MS}ms`),
              ),
            REDIS_DEADLINE_MS,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async evaluate(
    keys: string[],
    args: string[],
  ): Promise<[number, number, number, number]> {
    const client = this.redisService.client;

    try {
      const sha =
        this.scriptSha ??
        ((await client.script("LOAD", INCREMENT_SCRIPT)) as string);

      this.scriptSha = sha;

      return (await client.evalsha(sha, keys.length, ...keys, ...args)) as [
        number,
        number,
        number,
        number,
      ];
    } catch (error) {
      if (!isNoScriptError(error)) {
        throw error;
      }

      // Redis was restarted or its script cache flushed. Send the source once,
      // and let the next call re-prime the cache.
      this.scriptSha = undefined;

      return (await client.eval(
        INCREMENT_SCRIPT,
        keys.length,
        ...keys,
        ...args,
      )) as [number, number, number, number];
    }
  }
}
