import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

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

  /**
   * Finds a unique refresh token by the provided arguments.
   *
   * @param args - The arguments to find the refresh token.
   * @returns The found refresh token or null if not found.
   * @throws HttpException if the refresh token is not found or if an internal error occurs.
   */
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

  /**
   * Finds multiple refresh tokens based on the provided arguments.
   *
   * @param args - The arguments to find the refresh tokens.
   * @returns An array of found refresh tokens.
   * @throws HttpException if an internal error occurs while finding refresh tokens.
   */
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

  /**
   * Creates a new refresh token with the provided data.
   *
   * @param data - The data to create the refresh token.
   * @returns A promise that resolves when the refresh token is created.
   * @throws HttpException if the creation fails due to unique constraint or foreign key constraint violations.
   */
  async createRefreshToken(
    data: Prisma.RefreshTokenCreateArgs["data"],
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
