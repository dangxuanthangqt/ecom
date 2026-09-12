import { Prisma } from "@prisma/client";

import { OrderByTypeToOrderByFieldType } from "@/types/utility-types";

export type ReviewOrderByFieldsType = keyof Pick<
  Prisma.ReviewOrderByWithRelationInput,
  "createdAt" | "updatedAt" | "rating"
>;

export const ReviewOrderByFields: OrderByTypeToOrderByFieldType<ReviewOrderByFieldsType> =
  {
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
    RATING: "rating",
  } as const;
