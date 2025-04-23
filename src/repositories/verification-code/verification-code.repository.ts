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
