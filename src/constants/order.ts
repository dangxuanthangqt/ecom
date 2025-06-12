export const ORDER = {
  ASC: "ASC",
  DESC: "DESC",
} as const;

export type Order = (typeof ORDER)[keyof typeof ORDER];

export const ORDER_BY = {
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;
