import { HashingService } from "@/shared/services/hashing.service";

import { defineSeeder } from "../seed-context";
import { RoleId, UserId } from "../seed-ids";

const hashingService = new HashingService();

const requireEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required env var "${key}" for the admin seed`);
  }

  return value;
};

/**
 * The single account the platform cannot bootstrap without. Its credentials come
 * from the environment, never from a checked-in fixture, so the same seeder can
 * run in staging/production without shipping a known password.
 *
 * The password is written on create only: re-seeding must not silently reset a
 * password that was rotated afterwards.
 */
export default defineSeeder({
  name: "admin-user",
  tier: "core",
  run: async ({ prisma, log }) => {
    const email = requireEnv("ADMIN_EMAIL");

    await prisma.user.upsert({
      where: { id: UserId.ADMIN },
      create: {
        id: UserId.ADMIN,
        email,
        name: requireEnv("ADMIN_NAME"),
        phoneNumber: requireEnv("ADMIN_PHONE_NUMBER"),
        password: hashingService.hash(requireEnv("ADMIN_PASSWORD")),
        roleId: RoleId.ADMIN,
        status: "ACTIVE",
      },
      update: {
        email,
        roleId: RoleId.ADMIN,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    log(`admin user <${email}>`);
  },
});
