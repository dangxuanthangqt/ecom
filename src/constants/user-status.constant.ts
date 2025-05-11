export const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED",
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];
