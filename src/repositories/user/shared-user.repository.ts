import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
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

      if (isRecordNotFoundPrismaError(error)) {
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

  async findMany<T extends Prisma.UserFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>,
  ): Promise<Prisma.UserGetPayload<T>[]> {
    try {
      const users = await this.prismaService.user.findMany(args);

      return users;
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to find users.",
      });
    }
  }

  async findFirstOrThrow<T extends Prisma.UserFindFirstOrThrowArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindFirstOrThrowArgs>,
  ): Promise<Prisma.UserGetPayload<T>> {
    try {
      const user = await this.prismaService.user.findFirstOrThrow(args);

      return user;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "User not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to find first user.",
      });
    }
  }

  async findFirst<T extends Prisma.UserFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>,
  ): Promise<Prisma.UserGetPayload<T> | null> {
    try {
      const user = await this.prismaService.user.findFirst(args);

      return user;
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to find first user.",
      });
    }
  }

  async count<T extends Prisma.UserCountArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserCountArgs>,
  ): Promise<number> {
    try {
      const count = await this.prismaService.user.count(args);

      return count as number;
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to count users.",
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

  async updateUser<T extends Prisma.UserUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>,
  ): Promise<Prisma.UserGetPayload<T>> {
    try {
      const user = await this.prismaService.user.update(args);

      return user;
    } catch (error) {
      this.logger.error(error);

      if (isRecordToUpdateOrDeleteNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "User not found.",
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
