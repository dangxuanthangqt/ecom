export const ORDER = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type OrderType = (typeof ORDER)[keyof typeof ORDER];

export const ORDER_BY = {
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;
