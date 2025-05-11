export const Role = {
  ADMIN: "admin",
  CLIENT: "client",
  SELLER: "seller",
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];
