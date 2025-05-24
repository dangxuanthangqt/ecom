import { Prisma } from "@prisma/client";

// hover mouse over the roleSelect to see the type
// this is a Prisma validator that validates the shape of the object
export const roleWithPermissionsSelect = Prisma.validator<Prisma.RoleSelect>()({
  id: true,
  name: true,
  description: true,
  isActive: true,
  permissions: {
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      path: true,
      method: true,
      module: true,
    },
  },
});

export const roleSelect = Prisma.validator<Prisma.RoleSelect>()({
  id: true,
  name: true,
  description: true,
  isActive: true,
});
