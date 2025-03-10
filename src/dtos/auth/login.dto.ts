import { Expose } from "class-transformer";
import { IsEmail, IsString, Length } from "class-validator";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class LoginRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 20, { message: "Password must be between 8 and 20 characters." })
  password: string;
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
