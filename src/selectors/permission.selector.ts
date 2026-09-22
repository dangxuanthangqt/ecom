import { Prisma } from "@prisma/client";

import { NOT_DELETED } from "@/constants/soft-delete.constant";

export const permissionSelect = Prisma.validator<Prisma.PermissionSelect>()({
  id: true,
  key: true,
  resource: true,
  action: true,
  scope: true,
  description: true,
});

export const permissionWithRolesSelect =
  Prisma.validator<Prisma.PermissionSelect>()({
    ...permissionSelect,
    roles: {
      where: NOT_DELETED,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        isSystem: true,
      },
    },
  });
