import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail, IsOptional, IsString, IsUrl, Length } from "class-validator";

import { UserStatus } from "@/constants/user-status.constant";
import { IsPasswordMatch } from "@/validations/decorators/is-password-match.decorator";

export class RegisterRequestDto {
  @ApiProperty({
    description: "The user's email address",
    example: "user@example.com",
    format: "email",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "The user's password",
    example: "securePassword123",
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @Length(8, 20, { message: "Password must be between 8 and 20 characters." })
  password: string;

  @ApiProperty({
    description: "Confirm password",
    example: "securePassword123",
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @IsPasswordMatch("password")
  confirmPassword: string;

  @ApiProperty({
    description: "The user's phone number",
    example: "0987654321",
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
  })
  @IsString({ message: "Name must be a string." })
  @Length(1, 100, { message: "Name must be between 1 and 100 characters." })
  name: string;

  @ApiPropertyOptional({
    description: "URL to user's avatar image",
    example: "https://example.com/avatars/johndoe.jpg",
  })
  @IsUrl({}, { message: "Avatar must be a valid URL." })
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: "Verification code",
    example: "123456",
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
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "The user's email address",
    example: "user@example.com",
    format: "email",
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
    format: "date-time",
  })
  @Expose()
  createdAt: Date;
  @ApiProperty({
    description: "The user's status",
    example: UserStatus.ACTIVE,
    enum: [UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BLOCKED],
  })
  @Expose()
  status: string;

  @ApiProperty({
    description: "URL to user's avatar image",
    example: "https://example.com/avatars/johndoe.jpg",
    nullable: true,
    type: String,
  })
  @Expose()
  avatar: string | null;

  @ApiProperty({
    description: "The user's updated date",
    example: "2023-10-27T00:00:00.000Z",
    format: "date-time",
  })
  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<RegisterResponseDto>) {
    Object.assign(this, partial);
  }
}
