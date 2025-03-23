import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from "@nestjs/common";
import { User } from "@prisma/client";

import { UserInputData } from "./user.repository.type";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
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
        // Handle foreign key constraint violation (e.g., invalid roleId)
        throw new UnprocessableEntityException([
          {
            message: "Invalid role ID.",
            path: "roleId",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to create user.",
          path: "user",
        },
      ]);
    }
  }
}
