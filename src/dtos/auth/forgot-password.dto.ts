import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail, IsString, Length } from "class-validator";

import { IsPasswordMatch } from "@/validations/decorators/is-password-match.decorator";

export class ForgotPasswordRequestDto {
  @ApiProperty({
    description: "The user's email address",
    example: "user@example.com",
    required: true,
  })
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "The new password for the user",
    example: "newSecurePassword123",
    required: true,
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @Length(8, 20, { message: "Password must be between 8 and 20 characters." })
  password: string;

  @ApiProperty({
    description: "Confirm the new password",
    example: "newSecurePassword123",
    required: true,
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @IsPasswordMatch("password")
  confirmPassword: string;

  @ApiProperty({
    description: "The verification code sent to the user's email",
    example: "123456",
    required: true,
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: "Code must be 6 characters." })
  code: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    description: "Message indicating the success of the password update",
    example: "Password has been updated.",
  })
  @Expose()
  message: string;

  constructor(partial: Partial<ForgotPasswordResponseDto>) {
    Object.assign(this, partial);
  }
}
