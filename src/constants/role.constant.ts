export const Role = {
  ADMIN: "admin",
  CLIENT: "client",
  SELLER: "seller",
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

export const ActiveStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED",
};

export type ActiveStatus = (typeof ActiveStatus)[keyof typeof ActiveStatus];
