import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { VerificationCodeInputData } from "./verification-code.repository.type";

import { PrismaService } from "@/shared/services/prisma.service";
import { isRecordToUpdateNotFoundPrismaError } from "@/shared/utils/prisma-error";

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
      if (error instanceof Error) {
        this.logger.error(`Failed to delete verification code`, error.stack);
      }
      if (isRecordToUpdateNotFoundPrismaError(error)) {
        throw new NotFoundException([
          {
            message: "Verification code not found.",
            path: "verificationCode",
          },
        ]);
      }
      throw new InternalServerErrorException([
        {
          message: "Failed to delete verification code.",
          path: "verificationCode",
        },
      ]);
    }
  }

  async createVerificationCode({
    code,
    email,
    type,
    expiresAt,
  }: VerificationCodeInputData) {
    const verificationCode = await this.prismaService.verificationCode.upsert({
      where: {
        email: email,
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
    });

    return verificationCode;
  }

  async findUnique<T extends Prisma.VerificationCodeFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.VerificationCodeFindUniqueArgs>,
  ): Promise<Prisma.VerificationCodeGetPayload<T> | null> {
    try {
      const verificationCode =
        await this.prismaService.verificationCode.findUnique(args);

      return verificationCode;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to find verification code`, error.stack);
      }
      throw new InternalServerErrorException([
        {
          message: "Failed to find verification code.",
          path: "verificationCode",
        },
      ]);
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
      if (error instanceof Error) {
        this.logger.error(`Failed to find verification code`, error.stack);
      }
      if (isRecordToUpdateNotFoundPrismaError(error)) {
        throw new NotFoundException([
          {
            message: "Verification code not found.",
            path: "verificationCode",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to find verification code.",
          path: "verificationCode",
        },
      ]);
    }
  }
}
