import { Expose } from "class-transformer";
import { IsEmail, IsIn, IsString, Length } from "class-validator";

import { ActiveStatus } from "@/constants/role.constant";
import { IsPasswordMatch } from "@/decorators/auth/match-password.decorator";

export class RegisterRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 20, { message: "Password must be between 8 and 20 characters." })
  password: string;

  @IsString()
  @Length(10, 11, {
    message: "Phone number must be between 8 and 20 characters.",
  })
  phoneNumber: string;

  @IsString()
  @IsPasswordMatch("password")
  confirmPassword: string;

  @IsString()
  name: string;

  @IsString()
  @Length(6, 6, { message: "Code must be 6 characters." })
  code: string;
}

export class RegisterResponseDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  createdAt: Date;

  @Expose()
  @IsIn([ActiveStatus.ACTIVE, ActiveStatus.INACTIVE, ActiveStatus.BLOCKED])
  status: string;

  @Expose()
  avatar: string | null;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<RegisterResponseDto>) {
    Object.assign(this, partial);
  }
}
