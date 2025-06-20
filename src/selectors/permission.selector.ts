import { Prisma } from "@prisma/client";

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
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
      },
    },
  });
