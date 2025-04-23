import { Injectable, Logger } from "@nestjs/common";
import { Prisma, RefreshToken } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

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
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Refresh token not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to find refresh token.",
      });
    }
  }

  async delete<T extends Prisma.RefreshTokenDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.RefreshTokenDeleteArgs>,
  ): Promise<Prisma.RefreshTokenGetPayload<T>> {
    try {
      const result = await this.prismaService.refreshToken.delete(args);

      return result;
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to delete refresh token.",
      });
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
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        // Handle unique constraint violation (e.g., duplicate token)

        throwHttpException({
          type: "unprocessable",
          message: "Refresh token already exists.",
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
        message: "Failed to create refresh token.",
      });
    }
  }
}
