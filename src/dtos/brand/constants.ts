import { Prisma } from "@prisma/client";

import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type BrandOrderByFieldsType = keyof Pick<
  Prisma.BrandOrderByWithRelationInput,
  "createdAt" | "name" | "updatedAt"
>;

export const BrandOrderByFields: OrderByTypeToOrderByFieldType<BrandOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    NAME: "name",
    UPDATED_AT: "updatedAt",
  } as const;
