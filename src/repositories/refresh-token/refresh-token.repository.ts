import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, RefreshToken } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";

@Injectable()
export class RefreshTokenRepository {
  private readonly logger = new Logger(RefreshTokenRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  async findUniqueOrThrow<T extends Prisma.RefreshTokenFindUniqueOrThrowArgs>(
    args: Prisma.SelectSubset<T, Prisma.RefreshTokenFindUniqueOrThrowArgs>,
  ): Promise<Prisma.RefreshTokenGetPayload<T>> {
    try {
      const refreshToken =
        await this.prismaService.refreshToken.findUniqueOrThrow(args);

      return refreshToken;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to find refresh token with args: ${JSON.stringify(args)}`,
          error.stack,
        );
      }

      if (isRecordNotFoundPrismaError(error)) {
        throw new NotFoundException([
          {
            message: "Refresh token not found.",
            path: "refreshToken",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to find refresh token.",
          path: "refreshToken",
        },
      ]);
    }
  }

  async delete<T extends Prisma.RefreshTokenDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.RefreshTokenDeleteArgs>,
  ): Promise<Prisma.RefreshTokenGetPayload<T>> {
    try {
      const result = await this.prismaService.refreshToken.delete(args);

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to delete refresh token with args: ${JSON.stringify(args)}`,
          error.stack,
        );
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to delete refresh token.",
          path: "refreshToken",
        },
      ]);
    }
  }

  async createRefreshToken(
    data: Pick<RefreshToken, "userId" | "deviceId" | "token" | "expiresAt">,
  ): Promise<void> {
    this.logger.log(`Creating refresh token for user: ${data.userId}`);

    try {
      await this.prismaService.refreshToken.create({
        data,
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create refresh token`, error.stack);
      }

      if (isUniqueConstraintPrismaError(error)) {
        // Handle unique constraint violation (e.g., duplicate token)
        throw new UnprocessableEntityException([
          {
            message: "Refresh token already exists.",
            path: "token",
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        // Handle foreign key constraint violation (e.g., invalid userId)
        throw new UnprocessableEntityException([
          {
            message: "Invalid user ID.",
            path: "userId",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to create refresh token.",
          path: "refreshToken",
        },
      ]);
    }
  }
}
