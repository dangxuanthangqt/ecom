import { VerificationCodeType } from "@prisma/client";
import { Expose } from "class-transformer";
import { IsEmail, IsIn } from "class-validator";

import { VerificationCodeTypeType } from "@/constants/verification-code.constant";

export class SendOTPRequestDto {
  @IsEmail()
  email: string;

  @IsIn([
    VerificationCodeType.REGISTER,
    VerificationCodeType.FORGOT_PASSWORD,
    VerificationCodeType.LOGIN,
    VerificationCodeType.DISABLE_2FA,
  ])
  type: VerificationCodeTypeType;
}

export class SendOTPResponseDto {
  @Expose()
  code: string;
  @Expose()
  createdAt: Date;

  @Expose()
  expiresAt: Date;

  constructor(data: Partial<SendOTPResponseDto>) {
    Object.assign(this, data);
  }
}
