import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { VerificationCodeInputData } from "./verification-code.repository.type";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isRecordToUpdateOrDeleteNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class VerificationCodeRepository {
  private readonly logger = new Logger(VerificationCodeRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Deletes verification codes based on the provided arguments.
   *
   * @param args - The arguments to delete verification codes.
   * @returns A promise that resolves when the deletion is complete.
   * @throws HttpException if the deletion fails or if the verification code is not found.
   */
  async deleteVerificationCode<T extends Prisma.VerificationCodeDeleteManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.VerificationCodeDeleteManyArgs>,
  ): Promise<void> {
    try {
      await this.prismaService.verificationCode.deleteMany(args);
    } catch (error) {
      this.logger.error(error);

      if (isRecordToUpdateOrDeleteNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Verification code not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to delete verification code.",
      });
    }
  }

  /**
   * Creates or updates a verification code based on the provided input data.
   *
   * @param code - The verification code to create or update.
   * @param email - The email associated with the verification code.
   * @param type - The type of verification code (e.g., email verification, password reset).
   * @param expiresAt - The expiration date and time of the verification code.
   * @returns The created or updated verification code.
   * @throws HttpException if the creation or update fails due to unique constraint violations or other errors.
   */
  async createVerificationCode({
    code,
    email,
    type,
    expiresAt,
  }: VerificationCodeInputData) {
    try {
      const verificationCode = await this.prismaService.verificationCode.upsert(
        {
          where: {
            email_code_type: {
              // dùng find unique or upsert mới có thể dùng được field kết hợp này
              email,
              code,
              type,
            },
          },
          create: {
            code,
            email,
            type,
            expiresAt,
          },
          update: {
            code,
            type,
            expiresAt,
          },
        },
      );

      return verificationCode;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Verification code already exists.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create or update verification code.",
      });
    }
  }

  /**
   * Finds a unique verification code based on the provided arguments.
   *
   * @param args - The arguments to find the verification code.
   * @returns The found verification code or null if not found.
   * @throws HttpException if an internal error occurs while finding the verification code.
   */
  async findUnique<T extends Prisma.VerificationCodeFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.VerificationCodeFindUniqueArgs>,
  ): Promise<Prisma.VerificationCodeGetPayload<T> | null> {
    try {
      const verificationCode =
        await this.prismaService.verificationCode.findUnique(args);

      return verificationCode;
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to find verification code.",
      });
    }
  }

  /**
   * Finds a unique verification code or throws an error if not found.
   *
   * @param args - The arguments to find the verification code.
   * @returns The found verification code.
   * @throws HttpException if the verification code is not found or if an internal error occurs.
   */
  async findUniqueOrThrow<
    T extends Prisma.VerificationCodeFindUniqueOrThrowArgs,
  >(
    args: Prisma.SelectSubset<T, Prisma.VerificationCodeFindUniqueOrThrowArgs>,
  ): Promise<Prisma.VerificationCodeGetPayload<T>> {
    try {
      const verificationCode =
        await this.prismaService.verificationCode.findUniqueOrThrow(args);
      return verificationCode;
    } catch (error) {
      this.logger.error(error);

      if (isRecordToUpdateOrDeleteNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Verification code not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to find verification code.",
      });
    }
  }
}
