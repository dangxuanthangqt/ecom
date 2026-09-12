import { Prisma } from "@prisma/client";

import { NOT_DELETED } from "@/constants/soft-delete.constant";

export const permissionSelect = Prisma.validator<Prisma.PermissionSelect>()({
  id: true,
  name: true,
  description: true,
  path: true,
  method: true,
  module: true,
});

export const permissionWithRolesSelect =
  Prisma.validator<Prisma.PermissionSelect>()({
    id: true,
    name: true,
    description: true,
    path: true,
    method: true,
    module: true,
    roles: {
      where: NOT_DELETED,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
      },
    },
  });
