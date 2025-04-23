import { Injectable, Logger } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";

import { UserInputData } from "./user.repository.type";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordToUpdateOrDeleteNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}
  private readonly logger = new Logger(UserRepository.name);

  async createUser(
    data: UserInputData,
  ): Promise<Omit<User, "password" | "totpSecret">> {
    this.logger.log(`Creating user with email: ` + data.email);

    try {
      const user = await this.prismaService.user.create({
        data,
        omit: {
          password: true,
          totpSecret: true,
        },
      });

      return user;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Email is already exist.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Invalid foreign key constraint.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create user.",
      });
    }
  }

  async updateUser({
    where,
    data,
  }: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<Omit<User, "password" | "totpSecret"> | undefined> {
    try {
      const user = await this.prismaService.user.update({
        where,
        data,
        omit: {
          password: true,
          totpSecret: true,
        },
      });

      return user;
    } catch (error) {
      this.logger.error(error);

      if (isRecordToUpdateOrDeleteNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "User not found.",
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Email is already in use.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Invalid foreign key constraint.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update user.",
      });
    }
  }
}
