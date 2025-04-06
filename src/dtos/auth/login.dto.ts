import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail, IsOptional, IsString, Length } from "class-validator";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { IsOnlyOneExists } from "@/validations/decorators/is-only-one-exists";

export class LoginRequestDto {
  @ApiProperty({
    description: "The user's email address",
    example: "user@example.com",
    required: true,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "The user's password",
    example: "securePassword123",
    required: true,
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @Length(8, 20, { message: "Password must be between 8 and 20 characters." })
  password: string;

  @ApiProperty({
    description: "The user's TOTP code (if 2FA is enabled)",
    example: "123456",
    required: false,
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsOptional()
  @Length(6, 6, { message: "totpCode must be exactly 6 characters." })
  totpCode: string;

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
  @IsOnlyOneExists("totpCode")
  code: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: "The access token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @Expose()
  accessToken: string;

  @ApiProperty({
    description: "The refresh token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
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
