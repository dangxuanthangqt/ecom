import { Test } from "@nestjs/testing";

import { RedisService } from "../redis.service";
import { RolePermissionCacheService } from "../role-permission-cache.service";

const ROLE_ID = "11111111-1111-4111-8111-111111111111";
const METHOD = "GET";
const PATH = "/users";
const CACHED_ROLE = { id: ROLE_ID, permissions: [{ id: "perm-1" }] };

const createRedisClientMock = () => ({
  get: jest.fn(),
  set: jest.fn(),
  scan: jest.fn(),
  del: jest.fn(),
});

const setup = async () => {
  const redisClient = createRedisClientMock();

  const moduleRef = await Test.createTestingModule({
    providers: [
      RolePermissionCacheService,
      { provide: RedisService, useValue: { client: redisClient } },
    ],
  }).compile();

  const service = moduleRef.get<RolePermissionCacheService>(
    RolePermissionCacheService,
  );

  return { service, redisClient };
};

describe("RolePermissionCacheService", () => {
  describe("get", () => {
    it("returns the parsed value on a cache hit", async () => {
      // Arrange
      const { service, redisClient } = await setup();
      redisClient.get.mockResolvedValue(JSON.stringify(CACHED_ROLE));

      // Act
      const result = await service.get(ROLE_ID, METHOD, PATH);

      // Assert
      expect(redisClient.get).toHaveBeenCalledWith(
        `role-permission:${ROLE_ID}:${METHOD}:${PATH}`,
      );
      expect(result).toEqual(CACHED_ROLE);
    });

    it("returns null on a cache miss", async () => {
      // Arrange
      const { service, redisClient } = await setup();
      redisClient.get.mockResolvedValue(null);

      // Act
      const result = await service.get(ROLE_ID, METHOD, PATH);

      // Assert
      expect(result).toBeNull();
    });

    it("fails open to null when Redis throws, instead of breaking auth", async () => {
      // Arrange
      const { service, redisClient } = await setup();
      redisClient.get.mockRejectedValue(new Error("connection refused"));

      // Act
      const result = await service.get(ROLE_ID, METHOD, PATH);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("writes the JSON-serialized value with an expiry", async () => {
      // Arrange
      const { service, redisClient } = await setup();
      redisClient.set.mockResolvedValue("OK");

      // Act
      await service.set(ROLE_ID, METHOD, PATH, CACHED_ROLE);

      // Assert
      expect(redisClient.set).toHaveBeenCalledWith(
        `role-permission:${ROLE_ID}:${METHOD}:${PATH}`,
        JSON.stringify(CACHED_ROLE),
        "EX",
        300,
      );
    });

    it("swallows Redis write failures instead of throwing", async () => {
      // Arrange
      const { service, redisClient } = await setup();
      redisClient.set.mockRejectedValue(new Error("connection refused"));

      // Act & Assert
      await expect(
        service.set(ROLE_ID, METHOD, PATH, CACHED_ROLE),
      ).resolves.toBeUndefined();
    });
  });

  describe("invalidateRole", () => {
    it("scans and deletes every key for that role", async () => {
      // Arrange
      const { service, redisClient } = await setup();
      redisClient.scan
        .mockResolvedValueOnce([
          "17",
          [`role-permission:${ROLE_ID}:GET:/users`],
        ])
        .mockResolvedValueOnce([
          "0",
          [`role-permission:${ROLE_ID}:POST:/users`],
        ]);
      redisClient.del.mockResolvedValue(1);

      // Act
      await service.invalidateRole(ROLE_ID);

      // Assert
      expect(redisClient.scan).toHaveBeenCalledWith(
        "0",
        "MATCH",
        `role-permission:${ROLE_ID}:*`,
        "COUNT",
        100,
      );
      expect(redisClient.scan).toHaveBeenCalledWith(
        "17",
        "MATCH",
        `role-permission:${ROLE_ID}:*`,
        "COUNT",
        100,
      );
      expect(redisClient.del).toHaveBeenCalledWith(
        `role-permission:${ROLE_ID}:GET:/users`,
        `role-permission:${ROLE_ID}:POST:/users`,
      );
    });

    it("does not call del when no keys match", async () => {
      // Arrange
      const { service, redisClient } = await setup();
      redisClient.scan.mockResolvedValueOnce(["0", []]);

      // Act
      await service.invalidateRole(ROLE_ID);

      // Assert
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });

  describe("invalidateAll", () => {
    it("scans and deletes every cached role-permission key", async () => {
      // Arrange
      const { service, redisClient } = await setup();
      redisClient.scan.mockResolvedValueOnce([
        "0",
        [`role-permission:${ROLE_ID}:GET:/users`],
      ]);
      redisClient.del.mockResolvedValue(1);

      // Act
      await service.invalidateAll();

      // Assert
      expect(redisClient.scan).toHaveBeenCalledWith(
        "0",
        "MATCH",
        "role-permission:*",
        "COUNT",
        100,
      );
      expect(redisClient.del).toHaveBeenCalledWith(
        `role-permission:${ROLE_ID}:GET:/users`,
      );
    });
  });
});
