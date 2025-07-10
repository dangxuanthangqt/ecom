import { Prisma } from "@prisma/client";

import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type RoleOrderByFieldsType = keyof Pick<
  Prisma.RoleOrderByWithRelationInput,
  "createdAt" | "name" | "updatedAt" // Add other fields as needed
>;

export const RoleOrderByFields: OrderByTypeToOrderByFieldType<RoleOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    NAME: "name",
    UPDATED_AT: "updatedAt",
  } as const;
