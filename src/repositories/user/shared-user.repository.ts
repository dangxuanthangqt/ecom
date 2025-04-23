import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordToUpdateOrDeleteNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class SharedUserRepository {
  private readonly logger = new Logger(SharedUserRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  async findUnique<T extends Prisma.UserFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindUniqueArgs>,
  ): Promise<Prisma.UserGetPayload<T> | null> {
    try {
      const user = await this.prismaService.user.findUnique(args);

      return user;
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to find user.",
      });
    }
  }

  async findUniqueOrThrow<T extends Prisma.UserFindUniqueOrThrowArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindUniqueOrThrowArgs>,
  ): Promise<Prisma.UserGetPayload<T>> {
    try {
      const user = await this.prismaService.user.findUniqueOrThrow(args);

      return user;
    } catch (error) {
      this.logger.error(error);

      if (isRecordToUpdateOrDeleteNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "User not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to find user.",
      });
    }
  }

  async createUser<T extends Prisma.UserCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserCreateArgs>,
  ): Promise<Prisma.UserGetPayload<T>> {
    try {
      const user = await this.prismaService.user.create(args);

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
}
