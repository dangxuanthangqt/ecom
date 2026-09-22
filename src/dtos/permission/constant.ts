import { Prisma } from "@prisma/client";

import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type PermissionOrderByFieldsType = keyof Pick<
  Prisma.PermissionOrderByWithRelationInput,
  "createdAt" | "key" | "resource" | "updatedAt"
>;

export const PermissionOrderByFields: OrderByTypeToOrderByFieldType<PermissionOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    KEY: "key",
    RESOURCE: "resource",
    UPDATED_AT: "updatedAt",
  } as const;
