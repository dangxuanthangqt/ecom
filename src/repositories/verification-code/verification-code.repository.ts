import { Injectable } from "@nestjs/common";
import { VerificationCode } from "@prisma/client";

import { VerificationCodeInputData } from "./verification-code.repository.type";

import { PrismaService } from "@/shared/services/prisma.service";

@Injectable()
export class VerificationCodeRepository {
  constructor(private readonly prismaService: PrismaService) {}

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

  async findUnique(
    where:
      | Pick<VerificationCode, "email">
      | Pick<VerificationCode, "id">
      | Pick<VerificationCode, "email" | "code" | "type">,
  ) {
    const verificationCode =
      await this.prismaService.verificationCode.findUnique({
        where,
      });

    return verificationCode;
  }
}
