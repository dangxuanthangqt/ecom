import { Prisma } from "@prisma/client";

import { roleSelect, roleWithPermissionsSelect } from "./role.selector";

export const userSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  avatar: true,
  status: true,
});

export const userWithRoleSelect = Prisma.validator<Prisma.UserSelect>()({
  ...userSelect,
  role: {
    select: roleSelect,
  },
});

export const userWithRoleAndPermissionsSelect =
  Prisma.validator<Prisma.UserSelect>()({
    ...userSelect,
    role: {
      select: roleWithPermissionsSelect,
    },
  });
