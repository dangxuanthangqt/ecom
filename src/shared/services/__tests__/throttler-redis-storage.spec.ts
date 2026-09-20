import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { RedisService } from "../redis.service";
import { ThrottlerRedisStorage } from "../throttler-redis-storage.service";

const createRedisMock = () => ({
  script: jest.fn().mockResolvedValue("sha-1"),
  evalsha: jest.fn(),
  eval: jest.fn(),
});

type RedisMock = ReturnType<typeof createRedisMock>;

const buildStorage = async (client: RedisMock) => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ThrottlerRedisStorage,
      { provide: RedisService, useValue: { client } },
    ],
  }).compile();

  return moduleRef.get(ThrottlerRedisStorage);
};

describe("ThrottlerRedisStorage - increment", () => {
  let client: RedisMock;
  let storage: ThrottlerRedisStorage;

  beforeEach(async () => {
    client = createRedisMock();
    storage = await buildStorage(client);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reports hits and converts the script's milliseconds into seconds", async () => {
    // Arrange — 42 hits, 30s left in the window, not blocked
    client.evalsha.mockResolvedValue([42, 30_000, 0, 0]);

    // Act
    const record = await storage.increment(
      "key",
      60_000,
      120,
      60_000,
      "default",
    );

    // Assert
    expect(record).toEqual({
      totalHits: 42,
      timeToExpire: 30,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it("reports a block with the time left on it", async () => {
    // Arrange
    client.evalsha.mockResolvedValue([6, 12_000, 1, 300_000]);

    // Act
    const record = await storage.increment(
      "key",
      60_000,
      5,
      300_000,
      "credential",
    );

    // Assert
    expect(record.isBlocked).toBe(true);
    expect(record.timeToBlockExpire).toBe(300);
  });

  it("rounds a part-second remainder up, never down to zero", async () => {
    // Arrange — 1ms left must not be reported as "retry immediately"
    client.evalsha.mockResolvedValue([6, 1, 1, 1]);

    // Act
    const record = await storage.increment("key", 60_000, 5, 300_000, "named");

    // Assert
    expect(record.timeToExpire).toBe(1);
    expect(record.timeToBlockExpire).toBe(1);
  });

  it("namespaces the counter and the block flag by throttler name", async () => {
    // Arrange
    client.evalsha.mockResolvedValue([1, 60_000, 0, 0]);

    // Act
    await storage.increment("abc", 60_000, 5, 60_000, "credential");

    // Assert — two throttlers sharing one tracker must not share a counter
    expect(client.evalsha).toHaveBeenCalledWith(
      "sha-1",
      2,
      "throttle:credential:{abc}",
      "throttle:credential:{abc}:blocked",
      "60000",
      "5",
      "60000",
    );
  });

  it("loads the script once and reuses the hash afterwards", async () => {
    // Arrange
    client.evalsha.mockResolvedValue([1, 60_000, 0, 0]);

    // Act
    await storage.increment("a", 60_000, 5, 60_000, "default");
    await storage.increment("b", 60_000, 5, 60_000, "default");

    // Assert
    expect(client.script).toHaveBeenCalledTimes(1);
    expect(client.evalsha).toHaveBeenCalledTimes(2);
  });

  it("falls back to sending the script when Redis has dropped it", async () => {
    // Arrange — a restarted Redis answers NOSCRIPT to a cached hash
    client.evalsha.mockRejectedValueOnce(
      new Error("NOSCRIPT No matching script"),
    );
    client.eval.mockResolvedValue([3, 60_000, 0, 0]);

    // Act
    const record = await storage.increment("a", 60_000, 5, 60_000, "default");

    // Assert
    expect(record.totalHits).toBe(3);
    expect(client.eval).toHaveBeenCalledTimes(1);
  });

  it("re-primes the script cache on the call after a NOSCRIPT", async () => {
    // Arrange
    client.evalsha.mockRejectedValueOnce(new Error("NOSCRIPT"));
    client.eval.mockResolvedValue([1, 60_000, 0, 0]);
    client.evalsha.mockResolvedValue([2, 60_000, 0, 0]);

    // Act
    await storage.increment("a", 60_000, 5, 60_000, "default");
    await storage.increment("a", 60_000, 5, 60_000, "default");

    // Assert — the hash was loaded again rather than every call paying for eval
    expect(client.script).toHaveBeenCalledTimes(2);
  });

  it("lets the request through when Redis is unreachable", async () => {
    // Arrange
    client.script.mockRejectedValue(new Error("Connection is closed."));

    // Act
    const record = await storage.increment(
      "key",
      60_000,
      5,
      300_000,
      "credential",
    );

    // Assert — failing closed would turn a cache outage into an API outage
    expect(record.isBlocked).toBe(false);
    expect(record.totalHits).toBe(0);
  });

  it("gives up on a Redis that is up but slow, rather than holding the request", async () => {
    // Arrange — the shared client would wait a full second; the guard is now in
    // front of every request, so that second would be paid by every response
    client.evalsha.mockImplementation(
      () =>
        new Promise((resolve) => {
          // Unref'd so the abandoned command cannot hold the jest worker open.
          setTimeout(resolve, 2_000).unref();
        }),
    );

    // Act
    const startedAt = Date.now();
    const record = await storage.increment(
      "key",
      60_000,
      5,
      300_000,
      "credential",
    );

    // Assert
    expect(Date.now() - startedAt).toBeLessThan(1_000);
    expect(record.isBlocked).toBe(false);
  });

  it("does not leak an unhandled rejection when the deadline wins", async () => {
    // Arrange — the abandoned command rejects long after the race is over
    const unhandled = jest.fn();
    process.once("unhandledRejection", unhandled);
    client.evalsha.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error("too late")), 200).unref();
        }),
    );

    // Act
    await storage.increment("key", 60_000, 5, 300_000, "credential");
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Assert
    expect(unhandled).not.toHaveBeenCalled();
    process.removeListener("unhandledRejection", unhandled);
  });

  it("warns when it fails open, so an unenforced limit is visible", async () => {
    // Arrange
    const warn = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    client.script.mockRejectedValue(new Error("Connection is closed."));

    // Act
    await storage.increment("key", 60_000, 5, 300_000, "credential");

    // Assert
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Rate limit not enforced"),
    );
  });
});
