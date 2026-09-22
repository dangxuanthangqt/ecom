import { User } from "@/generated/prisma/client";

export type UserInputData = Pick<
  User,
  "email" | "name" | "phoneNumber" | "password" | "roleId"
>;
