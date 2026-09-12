import { AppConfigService } from "../app-config.service";
import { RedisService } from "../redis.service";

const redisConstructor = jest.fn();
const redisClient = {
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue("OK"),
  disconnect: jest.fn(),
};

jest.mock("ioredis", () => ({
  __esModule: true,
  default: class {
    constructor(...args: unknown[]) {
      redisConstructor(...args);

      return redisClient;
    }
  },
}));

const REDIS_URL = "redis://localhost:6379";

const buildService = () => {
  const appConfigService = {
    appConfig: { redisUrl: REDIS_URL },
  } as unknown as AppConfigService;

  return new RedisService(appConfigService);
};

const getConstructorOptions = (): Record<string, unknown> => {
  const [, options] = redisConstructor.mock.calls[0] as [
    string,
    Record<string, unknown>,
  ];

  return options;
};

describe("RedisService", () => {
  beforeEach(() => {
    redisConstructor.mockClear();
    redisClient.on.mockClear();
    redisClient.quit.mockClear().mockResolvedValue("OK");
    redisClient.disconnect.mockClear();
  });

  it("connects using the configured REDIS_URL", () => {
    // Act
    buildService();

    // Assert
    expect(redisConstructor).toHaveBeenCalledWith(REDIS_URL, expect.anything());
  });

  /**
   * Regression guard: with ioredis's default offline queue, a Redis outage
   * makes every command wait for reconnection instead of failing, which was
   * measured at ~15s per authenticated request before this was set.
   */
  it("disables the offline queue so commands fail fast during an outage", () => {
    // Act
    buildService();

    // Assert
    expect(getConstructorOptions().enableOfflineQueue).toBe(false);
  });

  it("bounds connect and command time so a hung Redis cannot stall requests", () => {
    // Act
    buildService();

    // Assert
    const options = getConstructorOptions();
    expect(options.connectTimeout).toBe(3000);
    expect(options.commandTimeout).toBe(1000);
    expect(options.maxRetriesPerRequest).toBe(2);
  });

  it("keeps retrying in the background with a capped backoff so caching self-heals", () => {
    // Act
    buildService();

    // Assert
    const retryStrategy = getConstructorOptions().retryStrategy as (
      times: number,
    ) => number;
    expect(retryStrategy(1)).toBe(200);
    expect(retryStrategy(100)).toBe(5000);
  });

  it("logs connection errors instead of letting them crash the process", () => {
    // Act
    buildService();

    // Assert
    expect(redisClient.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("quits the client on module destroy", async () => {
    // Arrange
    const service = buildService();

    // Act
    await service.onModuleDestroy();

    // Assert
    expect(redisClient.quit).toHaveBeenCalledTimes(1);
  });

  /**
   * With the offline queue disabled, `quit()` rejects outright when Redis is
   * already unreachable — shutdown must not fail because of a dead cache.
   */
  it("falls back to disconnect when quitting a dead connection fails", async () => {
    // Arrange
    const service = buildService();
    redisClient.quit.mockRejectedValue(new Error("Stream isn't writeable"));

    // Act & Assert
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(redisClient.disconnect).toHaveBeenCalledTimes(1);
  });
});
