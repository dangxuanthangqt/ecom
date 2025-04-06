import { Expose } from "class-transformer";
import { IsEmail, IsString, Length } from "class-validator";

import { IsPasswordMatch } from "@/validations/decorators/is-password-match.decorator";

export class ForgotPasswordRequestDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 20, { message: "Password must be between 8 and 20 characters." })
  password: string;

  @IsString()
  @IsPasswordMatch("password")
  confirmPassword: string;

  @IsString()
  @Length(6, 6, { message: "Code must be 6 characters." })
  code: string;
}

export class ForgotPasswordResponseDto {
  @Expose()
  message: string;

  constructor(partial: Partial<ForgotPasswordResponseDto>) {
    Object.assign(this, partial);
  }
}
