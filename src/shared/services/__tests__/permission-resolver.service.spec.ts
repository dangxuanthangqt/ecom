import { Test } from "@nestjs/testing";

import { PermissionKey } from "@/constants/permission.constant";

import { PermissionResolverService } from "../permission-resolver.service";
import { PrismaService } from "../prisma.service";
import { RolePermissionCacheService } from "../role-permission-cache.service";

const ROLE_A = "11111111-1111-4111-8111-111111111111";
const ROLE_B = "22222222-2222-4222-8222-222222222222";

const setup = async () => {
  const prisma = { role: { findUnique: jest.fn() } };
  const cache = {
    getRoleKeys: jest.fn().mockResolvedValue(null),
    setRoleKeys: jest.fn().mockResolvedValue(undefined),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      PermissionResolverService,
      { provide: PrismaService, useValue: prisma },
      { provide: RolePermissionCacheService, useValue: cache },
    ],
  }).compile();

  return { service: moduleRef.get(PermissionResolverService), prisma, cache };
};

const roleRow = (...keys: string[]) => ({
  permissions: keys.map((key) => ({ key })),
});

describe("PermissionResolverService - forRoles", () => {
  it("returns the cached list without touching the database on a hit", async () => {
    const { service, prisma, cache } = await setup();
    cache.getRoleKeys.mockResolvedValue(["product:read:own"]);

    const granted = await service.forRoles([ROLE_A]);

    expect(granted).toEqual(new Set(["product:read:own"]));
    expect(prisma.role.findUnique).not.toHaveBeenCalled();
  });

  it("loads from the database on a miss and populates the cache", async () => {
    const { service, prisma, cache } = await setup();
    prisma.role.findUnique.mockResolvedValue(
      roleRow("product:read:own", "cart:update:own"),
    );

    const granted = await service.forRoles([ROLE_A]);

    expect(granted).toEqual(new Set(["product:read:own", "cart:update:own"]));
    expect(cache.setRoleKeys).toHaveBeenCalledWith(ROLE_A, [
      "product:read:own",
      "cart:update:own",
    ]);
  });

  it("only considers active, non-deleted roles and non-deleted permissions", async () => {
    const { service, prisma } = await setup();
    prisma.role.findUnique.mockResolvedValue(roleRow());

    await service.forRoles([ROLE_A]);

    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { id: ROLE_A, isActive: true, deletedAt: null },
      select: {
        permissions: { where: { deletedAt: null }, select: { key: true } },
      },
    });
  });

  it("resolves a missing or inactive role to an empty set, which the guard turns into 403", async () => {
    const { service, prisma, cache } = await setup();
    prisma.role.findUnique.mockResolvedValue(null);

    const granted = await service.forRoles([ROLE_A]);

    expect(granted.size).toBe(0);
    // Negative result is cached too, bounded by TTL and role invalidation.
    expect(cache.setRoleKeys).toHaveBeenCalledWith(ROLE_A, []);
  });

  it("drops a malformed key rather than granting something unparseable", async () => {
    const { service, prisma } = await setup();
    prisma.role.findUnique.mockResolvedValue(
      roleRow("product:read:own", "garbage", "product:updat:own"),
    );

    const granted = await service.forRoles([ROLE_A]);

    expect(granted).toEqual(new Set<PermissionKey>(["product:read:own"]));
  });

  it("unions the sets of several roles", async () => {
    const { service, cache } = await setup();
    cache.getRoleKeys
      .mockResolvedValueOnce(["product:read:own"])
      .mockResolvedValueOnce(["brand:read:any", "product:read:own"]);

    const granted = await service.forRoles([ROLE_A, ROLE_B]);

    expect(granted).toEqual(new Set(["product:read:own", "brand:read:any"]));
  });

  it("lets a database failure propagate instead of swallowing it", async () => {
    const { service, prisma } = await setup();
    const outage = new Error("Connection terminated unexpectedly");
    prisma.role.findUnique.mockRejectedValue(outage);

    await expect(service.forRoles([ROLE_A])).rejects.toBe(outage);
  });
});
