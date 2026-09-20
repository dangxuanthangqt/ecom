import { Role } from "@/constants/role.constant";

import { defineSeeder } from "../seed-context";
import { RoleId } from "../seed-ids";

const ROLES = [
  { id: RoleId.ADMIN, name: Role.ADMIN, description: "Admin role" },
  { id: RoleId.CLIENT, name: Role.CLIENT, description: "Client role" },
  { id: RoleId.SELLER, name: Role.SELLER, description: "Seller role" },
].map((role) => ({ ...role, isSystem: true }));

/**
 * Roles come before users (User.roleId is required) and are written with a null
 * createdById, because the admin that would own them does not exist yet.
 * Permissions and grants are NOT seeded here: the catalogue is collected from
 * `@RequirePermission` declarations and the three roles' grants come from
 * `RolePermissionMatrix`, both applied by `pnpm seed:initial-scripts:create-permission`,
 * which needs a booted Nest app to read the controllers.
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
          isSystem: true,
          deletedAt: null,
        },
      });
    }

    log(`${ROLES.length} roles`);
  },
});
