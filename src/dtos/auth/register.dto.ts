import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail, IsIn, IsString, Length } from "class-validator";

import { ActiveStatus } from "@/constants/role.constant";
import { IsPasswordMatch } from "@/validations/decorators/is-password-match.decorator";

export class RegisterRequestDto {
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
    description: "Confirm password",
    example: "securePassword123",
    required: true,
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @IsPasswordMatch("password")
  confirmPassword: string;

  @ApiProperty({
    description: "The user's phone number",
    example: "0987654321",
    required: true,
    minLength: 10,
    maxLength: 11,
  })
  @IsString()
  @Length(10, 11, {
    message: "Phone number must be between 8 and 20 characters.",
  })
  phoneNumber: string;

  @ApiProperty({
    description: "The user's name",
    example: "John Doe",
    required: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Verification code",
    example: "123456",
    required: true,
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: "Code must be 6 characters." })
  code: string;
}

export class RegisterResponseDto {
  @ApiProperty({
    description: "The user's ID",
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: "The user's email address",
    example: "user@example.com",
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: "The user's name",
    example: "John Doe",
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: "The user's phone number",
    example: "0987654321",
  })
  @Expose()
  phoneNumber: string;

  @ApiProperty({
    description: "The user's created date",
    example: "2023-10-27T00:00:00.000Z",
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: "The user's status",
    example: "ACTIVE",
    enum: [ActiveStatus.ACTIVE, ActiveStatus.INACTIVE, ActiveStatus.BLOCKED],
  })
  @Expose()
  @IsIn([ActiveStatus.ACTIVE, ActiveStatus.INACTIVE, ActiveStatus.BLOCKED])
  status: string;

  @ApiProperty({
    description: "The user's avatar",
    example: null,
    nullable: true,
  })
  @Expose()
  avatar: string | null;

  @ApiProperty({
    description: "The user's updated date",
    example: "2023-10-27T00:00:00.000Z",
  })
  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<RegisterResponseDto>) {
    Object.assign(this, partial);
  }
}
