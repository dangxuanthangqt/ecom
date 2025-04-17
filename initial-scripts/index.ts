/* eslint-disable no-console */
import { plainToInstance } from "class-transformer";
import { IsString } from "class-validator";
import { config } from "dotenv";

import { Role } from "@/constants/role.constant";
import { HashingService } from "@/shared/services/hashing.service";
import { PrismaService } from "@/shared/services/prisma.service";

config({ path: `.env.${process.env.APP_ENV || "development"}` });

const prismaService = new PrismaService();
const hashingService = new HashingService();

class AdminUserSchema {
  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  password: string;

  @IsString()
  phoneNumber: string;
}

async function main() {
  const roleCount = await prismaService.role.count();

  if (roleCount > 0) {
    throw new Error("Roles already exist");
  }

  const roles = await prismaService.role.createMany({
    data: [
      {
        name: Role.ADMIN,
        description: "Admin role",
      },
      {
        name: Role.CLIENT,
        description: "Client role",
      },
      {
        name: Role.SELLER,
        description: "Seller role",
      },
    ],
  });

  const adminRole = await prismaService.role.findFirstOrThrow({
    where: {
      name: Role.ADMIN,
    },
  });

  const adminUserData = plainToInstance(AdminUserSchema, {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    phoneNumber: process.env.ADMIN_PHONE_NUMBER,
  });

  const hashedPassword = hashingService.hash(adminUserData.password);

  const adminUser = await prismaService.user.create({
    data: {
      email: adminUserData.email,
      name: adminUserData.name,
      phoneNumber: adminUserData.phoneNumber,
      password: hashedPassword,
      roleId: adminRole.id,
    },
  });

  return {
    adminUser,
    createdRoleCount: roles.count,
  };
}

main()
  .then(({ adminUser, createdRoleCount }) => {
    console.log("admin user: ", adminUser);

    console.log("created role count: ", createdRoleCount);
  })
  .catch((error) => {
    console.error(error);
  });
