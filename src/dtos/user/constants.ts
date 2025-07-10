import { Prisma } from "@prisma/client";

import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type UserOrderByFieldsType = keyof Pick<
  Prisma.UserOrderByWithRelationInput,
  "createdAt" | "email" | "name" | "updatedAt" // Add other fields as needed
>;

export const UserOrderByFields: OrderByTypeToOrderByFieldType<UserOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    EMAIL: "email",
    NAME: "name",
    UPDATED_AT: "updatedAt",
  } as const;
