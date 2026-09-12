import { Prisma } from "@prisma/client";

import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type OrderOrderByFieldsType = keyof Pick<
  Prisma.OrderOrderByWithRelationInput,
  "createdAt" | "updatedAt"
>;

export const OrderOrderByFields: OrderByTypeToOrderByFieldType<OrderOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
  } as const;
