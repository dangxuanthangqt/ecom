export const Role = {
  ADMIN: "admin",
  CLIENT: "client",
  SELLER: "seller",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
