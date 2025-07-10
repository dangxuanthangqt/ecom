import { Prisma } from "@prisma/client";

import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type PermissionOrderByFieldsType = keyof Pick<
  Prisma.PermissionOrderByWithRelationInput,
  "createdAt" | "description" | "name" | "updatedAt"
>;

export const PermissionOrderByFields: OrderByTypeToOrderByFieldType<PermissionOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    DESCRIPTION: "description",
    NAME: "name",
    UPDATED_AT: "updatedAt",
  } as const;
