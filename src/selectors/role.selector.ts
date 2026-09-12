import { Prisma } from "@prisma/client";

import { NOT_DELETED } from "@/constants/soft-delete.constant";

import { permissionSelect } from "./permission.selector";

// hover mouse over the roleSelect to see the type
// this is a Prisma validator that validates the shape of the object
export const roleWithPermissionsSelect = Prisma.validator<Prisma.RoleSelect>()({
  id: true,
  name: true,
  description: true,
  isActive: true,
  permissions: {
    where: NOT_DELETED,
    select: permissionSelect,
  },
});

export const roleSelect = Prisma.validator<Prisma.RoleSelect>()({
  id: true,
  name: true,
  description: true,
  isActive: true,
});
