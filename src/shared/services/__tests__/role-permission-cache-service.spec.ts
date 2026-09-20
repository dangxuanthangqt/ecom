import { Test } from "@nestjs/testing";

import { PermissionKey } from "@/constants/permission.constant";

import { RedisService } from "../redis.service";
import { RolePermissionCacheService } from "../role-permission-cache.service";

const ROLE_ID = "11111111-1111-4111-8111-111111111111";
const KEYS: PermissionKey[] = ["product:read:own", "cart:update:own"];

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

  return {
    service: moduleRef.get(RolePermissionCacheService),
    redisClient,
  };
};

describe("RolePermissionCacheService", () => {
  describe("getRoleKeys", () => {
    it("returns the parsed key list on a cache hit", async () => {
      const { service, redisClient } = await setup();
      redisClient.get.mockResolvedValue(JSON.stringify(KEYS));

      await expect(service.getRoleKeys(ROLE_ID)).resolves.toEqual(KEYS);
      expect(redisClient.get).toHaveBeenCalledWith(
        `role-permission:${ROLE_ID}`,
      );
    });

    it("returns null on a cache miss", async () => {
      const { service, redisClient } = await setup();
      redisClient.get.mockResolvedValue(null);

      await expect(service.getRoleKeys(ROLE_ID)).resolves.toBeNull();
    });

    it("fails open to null when Redis throws, instead of breaking auth", async () => {
      const { service, redisClient } = await setup();
      redisClient.get.mockRejectedValue(new Error("Connection is closed."));

      await expect(service.getRoleKeys(ROLE_ID)).resolves.toBeNull();
    });
  });

  describe("setRoleKeys", () => {
    it("writes the JSON-serialized list with a 300s expiry", async () => {
      const { service, redisClient } = await setup();

      await service.setRoleKeys(ROLE_ID, KEYS);

      expect(redisClient.set).toHaveBeenCalledWith(
        `role-permission:${ROLE_ID}`,
        JSON.stringify(KEYS),
        "EX",
        300,
      );
    });

    it("swallows Redis write failures instead of throwing", async () => {
      const { service, redisClient } = await setup();
      redisClient.set.mockRejectedValue(new Error("READONLY"));

      await expect(service.setRoleKeys(ROLE_ID, KEYS)).resolves.toBeUndefined();
    });
  });

  describe("invalidateRole", () => {
    it("deletes the one key for that role without scanning", async () => {
      const { service, redisClient } = await setup();

      await service.invalidateRole(ROLE_ID);

      expect(redisClient.del).toHaveBeenCalledWith(
        `role-permission:${ROLE_ID}`,
      );
      expect(redisClient.scan).not.toHaveBeenCalled();
    });

    it("swallows a Redis failure", async () => {
      const { service, redisClient } = await setup();
      redisClient.del.mockRejectedValue(new Error("down"));

      await expect(service.invalidateRole(ROLE_ID)).resolves.toBeUndefined();
    });
  });

  describe("invalidateAll", () => {
    it("scans the namespace and deletes every role's cached set", async () => {
      const { service, redisClient } = await setup();
      redisClient.scan
        .mockResolvedValueOnce(["7", ["role-permission:a"]])
        .mockResolvedValueOnce(["0", ["role-permission:b"]]);

      await service.invalidateAll();

      expect(redisClient.scan).toHaveBeenCalledWith(
        "0",
        "MATCH",
        "role-permission:*",
        "COUNT",
        100,
      );
      expect(redisClient.del).toHaveBeenCalledWith(
        "role-permission:a",
        "role-permission:b",
      );
    });

    it("does not call del when nothing matches", async () => {
      const { service, redisClient } = await setup();
      redisClient.scan.mockResolvedValueOnce(["0", []]);

      await service.invalidateAll();

      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });
});
