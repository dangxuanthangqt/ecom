import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

import { roleSelect, roleWithPermissionsSelect } from "./role.selector";

export const userSelect = defineSelect<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  avatar: true,
  status: true,
});

export const userWithRoleSelect = defineSelect<Prisma.UserSelect>()({
  ...userSelect,
  role: {
    select: roleSelect,
  },
});

export const userWithRoleAndPermissionsSelect =
  defineSelect<Prisma.UserSelect>()({
    ...userSelect,
    role: {
      select: roleWithPermissionsSelect,
    },
  });
