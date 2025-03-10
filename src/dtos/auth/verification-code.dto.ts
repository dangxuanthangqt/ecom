import { Expose } from "class-transformer";
import { IsEmail, IsIn, IsString, Length } from "class-validator";

import { VerificationCodeType } from "@/constants/verification-code.constant";

export class VerificationCodeRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, { message: "Code must be 6 characters." })
  code: string;

  @IsString()
  @IsIn([VerificationCodeType.REGISTER, VerificationCodeType.FORGOT_PASSWORD])
  type: string;

  @IsString()
  expiresAt: string;
}

export class VerificationCodeResponseDto {
  @Expose()
  id: number;

  @Expose()
  code: string;

  @Expose()
  email: string;

  @Expose()
  type: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
