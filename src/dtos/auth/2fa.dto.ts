import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsOptional, IsString, Length } from "class-validator";

import { IsBothOrNoneExist } from "@/validations/decorators/is-both-or-none-exist";

export class Disable2faRequestDto {
  @ApiProperty({
    description: "The user's TOTP code (if 2FA is enabled)",
    example: "123456",
    required: false,
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsOptional()
  @Length(6, 6, { message: "OptCode must be exactly 6 characters." })
  totpCode?: string;

  @ApiProperty({
    description: "The user's verification code (if 2FA is enabled)",
    example: "123456",
    required: false,
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsOptional()
  @Length(6, 6, { message: "Verification code must be exactly 6 characters." })
  @IsBothOrNoneExist("totpCode")
  code?: string;
}

export class Disable2faResponseDto {
  @ApiProperty({
    description: "Message indicating the success of disabling 2FA",
    example: "2FA has been disabled.",
  })
  @Expose()
  message: string;

  constructor(partial: Partial<Disable2faResponseDto>) {
    Object.assign(this, partial);
  }
}

export class EnableTwoFactorAuthenticationResponseDto {
  @ApiProperty({
    description: "The secret key for 2FA setup",
    example: "JBSWY3DPEHPK3PXP",
  })
  @Expose()
  secret: string;

  @ApiProperty({
    description: "The URI for 2FA setup",
    example:
      "otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example",
  })
  @Expose()
  uri: string;

  constructor(partial: Partial<EnableTwoFactorAuthenticationResponseDto>) {
    Object.assign(this, partial);
  }
}
