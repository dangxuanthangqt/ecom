import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, User } from "@prisma/client";

import { UserInputData } from "./user.repository.type";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordToUpdateNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";

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
      if (error instanceof Error) {
        this.logger.error(`Failed to create user`, error.stack);
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Email is already exist.",
            path: "email",
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        const prismaError = error;
        const meta = prismaError.meta;
        const target = meta?.target as string[];

        const errorDetails = target.map((field) => {
          return {
            message: `Invalid ${field} ID.`,
            path: field,
          };
        });

        throw new UnprocessableEntityException(errorDetails);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to create user.",
          path: "user",
        },
      ]);
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
      if (error instanceof Error) {
        this.logger.error(`Failed to create user`, error.stack);
      }

      if (isRecordToUpdateNotFoundPrismaError(error)) {
        throw new NotFoundException([
          {
            message: "User not found.",
            path: "user",
          },
        ]);
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Email is already in use.",
            path: "email",
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        const prismaError = error;
        const meta = prismaError.meta;
        const target = meta?.target as string[];

        const errorDetails = target.map((field) => {
          return {
            message: `Invalid ${field} ID.`,
            path: field,
          };
        });

        throw new UnprocessableEntityException(errorDetails);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to update user.",
          path: "user",
        },
      ]);
    }
  }
}
