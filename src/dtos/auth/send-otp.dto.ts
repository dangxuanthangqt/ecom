import { ApiProperty } from "@nestjs/swagger";
import { VerificationCodeType } from "@prisma/client";
import { Expose } from "class-transformer";
import { IsEmail, IsIn } from "class-validator";

import { VerificationCodeTypeType } from "@/constants/verification-code.constant";

export class SendOTPRequestDto {
  @ApiProperty({
    description: "The user's email address",
    example: "user@example.com",
    required: true,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "The type of verification code being requested",
    enum: [
      VerificationCodeType.REGISTER,
      VerificationCodeType.FORGOT_PASSWORD,
      VerificationCodeType.LOGIN,
      VerificationCodeType.DISABLE_2FA,
    ],
    example: VerificationCodeType.REGISTER,
    required: true,
  })
  @IsIn([
    VerificationCodeType.REGISTER,
    VerificationCodeType.FORGOT_PASSWORD,
    VerificationCodeType.LOGIN,
    VerificationCodeType.DISABLE_2FA,
  ])
  type: VerificationCodeTypeType;
}

export class SendOTPResponseDto {
  @ApiProperty({
    description: "The generated OTP code",
    example: "123456",
  })
  @Expose()
  code: string;

  @ApiProperty({
    description: "The creation timestamp of the OTP code",
    example: "2023-10-27T00:00:00.000Z",
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: "The expiration timestamp of the OTP code",
    example: "2023-10-27T00:05:00.000Z",
  })
  @Expose()
  expiresAt: Date;

  constructor(data: Partial<SendOTPResponseDto>) {
    Object.assign(this, data);
  }
}
