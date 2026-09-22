import { NOT_DELETED } from "@/constants/soft-delete.constant";
import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

import { permissionSelect } from "./permission.selector";

// hover mouse over the roleSelect to see the type
// this is a Prisma validator that validates the shape of the object
export const roleWithPermissionsSelect = defineSelect<Prisma.RoleSelect>()({
  id: true,
  name: true,
  description: true,
  isActive: true,
  isSystem: true,
  permissions: {
    where: NOT_DELETED,
    select: permissionSelect,
  },
});

export const roleSelect = defineSelect<Prisma.RoleSelect>()({
  id: true,
  name: true,
  description: true,
  isActive: true,
  isSystem: true,
});
