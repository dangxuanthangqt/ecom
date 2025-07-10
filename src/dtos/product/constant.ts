import { Prisma } from "@prisma/client";

import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type ProductOrderByFieldsType =
  | keyof Pick<
      Prisma.ProductOrderByWithRelationInput,
      | "name"
      | "basePrice"
      | "virtualPrice"
      | "publishedAt"
      | "createdAt"
      | "updatedAt"
    >
  | "sale"; // Sale is a custom field, not directly in Prisma schema

export const ProductOrderByFields: OrderByTypeToOrderByFieldType<ProductOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    NAME: "name",
    BASE_PRICE: "basePrice",
    PUBLISHED_AT: "publishedAt",
    UPDATED_AT: "updatedAt",
    VIRTUAL_PRICE: "virtualPrice",
    SALE: "sale", // Custom field for sale
  } as const;
