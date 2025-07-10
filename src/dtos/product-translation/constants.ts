import { Prisma } from "@prisma/client";

import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type ProductTranslationOrderByFieldsType = keyof Pick<
  Prisma.ProductTranslationOrderByWithRelationInput,
  "createdAt" | "name" | "updatedAt"
>;

export const ProductTranslationOrderByFields: OrderByTypeToOrderByFieldType<ProductTranslationOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    NAME: "name",
    UPDATED_AT: "updatedAt",
  } as const;
