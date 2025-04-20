export const ORDER = {
  ASC: "ASC",
  DESC: "DESC",
} as const;

export type Order = (typeof ORDER)[keyof typeof ORDER];
