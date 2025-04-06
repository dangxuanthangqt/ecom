import { Expose } from "class-transformer";
import { IsOptional, IsString, Length } from "class-validator";

import { IsBothOrNoneExist } from "@/validations/decorators/is-both-or-none-exist";

export class Disable2faRequestDto {
  @IsString()
  @IsOptional()
  @Length(6, 6, { message: "OptCode must be exactly 6 characters." })
  totpCode?: string;

  @IsString()
  @IsOptional()
  @Length(6, 6, { message: "Verification code must be exactly 6 characters." })
  @IsBothOrNoneExist("totpCode")
  verificationCode?: string;
}

export class Disable2faResponseDto {
  @Expose()
  message: string;

  constructor(partial: Partial<Disable2faResponseDto>) {
    Object.assign(this, partial);
  }
}

export class TwoFactorAuthenticationResponseDto {
  @Expose()
  secret: string;

  @Expose()
  uri: string;

  constructor(partial: Partial<TwoFactorAuthenticationResponseDto>) {
    Object.assign(this, partial);
  }
}
