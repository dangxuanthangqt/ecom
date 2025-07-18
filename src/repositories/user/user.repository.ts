import { Injectable, Logger } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordToUpdateOrDeleteNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

import { UserInputData } from "./user.repository.type";

@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}
  private readonly logger = new Logger(UserRepository.name);

  /**
   * Registers a new user with the provided data.
   *
   * @param data - The input data for creating a new user.
   * @returns The created user without sensitive fields like password and totpSecret.
   * @throws HttpException if the email already exists or if there is a foreign key constraint error.
   */
  async registerUser(
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

  /**
   * Updates a user based on the provided criteria.
   *
   * @param where - The filtering criteria for the user to update.
   * @param data - The data to update the user with.
   * @returns The updated user without sensitive fields like password and totpSecret.
   */
  async updateUser({
    where,
    data,
  }: Pick<Prisma.UserUpdateArgs, "where" | "data">): Promise<
    Omit<User, "password" | "totpSecret">
  > {
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
