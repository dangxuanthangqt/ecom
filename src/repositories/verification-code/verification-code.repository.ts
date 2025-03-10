import { Injectable } from "@nestjs/common";

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
    const verificationCode = await this.prismaService.verificationCode.create({
      data: {
        code,
        email,
        type,
        expiresAt,
      },
    });

    return verificationCode;
  }
}
