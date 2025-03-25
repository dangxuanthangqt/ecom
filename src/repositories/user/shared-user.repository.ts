import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import { isRecordToUpdateNotFoundPrismaError } from "@/shared/utils/prisma-error";

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
      if (error instanceof Error) {
        this.logger.error(`Failed to find user`, error.stack);
      }
      throw new InternalServerErrorException([
        {
          message: "Failed to find user.",
          path: "user",
        },
      ]);
    }
  }

  async findUniqueOrThrow<T extends Prisma.UserFindUniqueOrThrowArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindUniqueOrThrowArgs>,
  ): Promise<Prisma.UserGetPayload<T>> {
    try {
      const user = await this.prismaService.user.findUniqueOrThrow(args);
      return user;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to find user`, error.stack);
      }
      if (isRecordToUpdateNotFoundPrismaError(error)) {
        throw new NotFoundException([
          {
            message: "User not found.",
            path: "user",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to find user.",
          path: "user",
        },
      ]);
    }
  }
  async createUser<T extends Prisma.UserCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserCreateArgs>,
  ): Promise<Prisma.UserGetPayload<T>> {
    try {
      const user = await this.prismaService.user.create(args);

      return user;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create user`, error.stack);
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
