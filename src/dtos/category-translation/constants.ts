import { Prisma } from "@prisma/client";

import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type CategoryTranslationOrderByFieldsType = keyof Pick<
  Prisma.CategoryTranslationOrderByWithRelationInput,
  "createdAt" | "name" | "updatedAt"
>;

export const CategoryTranslationOrderByFields: OrderByTypeToOrderByFieldType<CategoryTranslationOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    NAME: "name",
    UPDATED_AT: "updatedAt",
  } as const;
