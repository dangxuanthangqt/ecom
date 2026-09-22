import { Prisma } from "@/generated/prisma/client";
import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type CartItemOrderByFieldsType = keyof Pick<
  Prisma.CartItemOrderByWithRelationInput,
  "createdAt" | "updatedAt"
>;

export const CartItemOrderByFields: OrderByTypeToOrderByFieldType<CartItemOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
  } as const;
