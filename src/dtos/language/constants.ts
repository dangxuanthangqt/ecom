import { Prisma } from "@/generated/prisma/client";
import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type LanguageOrderByFieldsType = keyof Pick<
  Prisma.LanguageOrderByWithRelationInput,
  "createdAt" | "name" | "updatedAt"
>;

export const LanguageOrderByFields: OrderByTypeToOrderByFieldType<LanguageOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    NAME: "name",
    UPDATED_AT: "updatedAt",
  } as const;
