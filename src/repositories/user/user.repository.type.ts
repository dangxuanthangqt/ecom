import { User } from "@prisma/client";

export type UserInputData = Pick<
  User,
  "email" | "name" | "phoneNumber" | "password" | "roleId"
>;
