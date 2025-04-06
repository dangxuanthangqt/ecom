import { Expose } from "class-transformer";
import { IsEmail, IsOptional, IsString, Length } from "class-validator";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { IsOnlyOneExists } from "@/validations/decorators/is-only-one-exists";

export class LoginRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 20, { message: "Password must be between 8 and 20 characters." })
  password: string;

  @IsString()
  @IsOptional()
  @Length(6, 6, { message: "totpCode must be exactly 6 characters." })
  totpCode: string;

  @IsString()
  @IsOptional()
  @Length(6, 6, { message: "Verification code must be exactly 6 characters." })
  @IsOnlyOneExists("totpCode")
  verificationCode: string;
}

export class LoginResponseDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  constructor(partial: Partial<LoginResponseDto>) {
    Object.assign(this, partial);
  }
}

// Test with zod
const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(20),
});
//   .strict();

export class LoginRequestZodDto extends createZodDto(LoginRequestSchema) {}

const LoginResponseSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .strict();

export class LoginResponseZodDto extends createZodDto(LoginResponseSchema) {}
