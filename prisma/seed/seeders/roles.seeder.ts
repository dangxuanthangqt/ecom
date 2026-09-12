import { Role } from "@/constants/role.constant";

import { defineSeeder } from "../seed-context";
import { RoleId } from "../seed-ids";

const ROLES = [
  { id: RoleId.ADMIN, name: Role.ADMIN, description: "Admin role" },
  { id: RoleId.CLIENT, name: Role.CLIENT, description: "Client role" },
  { id: RoleId.SELLER, name: Role.SELLER, description: "Seller role" },
];

/**
 * Roles come before users (User.roleId is required) and are written with a null
 * createdById, because the admin that would own them does not exist yet.
 * Permissions are NOT seeded here: they are derived from the live route table by
 * `pnpm seed:initial-scripts:create-permission`, which needs a booted Nest app.
 */
export default defineSeeder({
  name: "roles",
  tier: "core",
  run: async ({ prisma, log }) => {
    for (const role of ROLES) {
      await prisma.role.upsert({
        where: { id: role.id },
        create: role,
        update: {
          name: role.name,
          description: role.description,
          deletedAt: null,
        },
      });
    }

    log(`${ROLES.length} roles`);
  },
});
