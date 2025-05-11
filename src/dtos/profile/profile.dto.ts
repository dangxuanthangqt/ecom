import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
} from "class-validator";

import { UserStatus, UserStatusType } from "@/constants/user-status.constant";
import {
  RoleResponseDto,
  RoleWithPermissionsResponseDto,
} from "@/dtos/role/role.dto";
import { IsPasswordMatch } from "@/validations/decorators/is-password-match.decorator";

export class ProfileResponseDto {
  @ApiProperty({
    description: "Unique identifier of the user",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "User's full name",
    example: "John Doe",
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: "User's email address",
    example: "john.doe@example.com",
    format: "email",
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: "User's phone number",
    example: "0987654321",
  })
  @Expose()
  phoneNumber: string;

  @ApiProperty({
    description: "URL to user's avatar image",
    example: "https://example.com/avatars/johndoe.jpg",
    type: String,
    nullable: true,
  })
  @Expose()
  avatar: string | null;

  @ApiProperty({
    description: "User's role with associated permissions",
    type: () => RoleWithPermissionsResponseDto,
  })
  @Expose()
  @Type(() => RoleWithPermissionsResponseDto)
  role: RoleWithPermissionsResponseDto;

  constructor(partial: Partial<ProfileResponseDto>) {
    Object.assign(this, partial);
  }
}

export class UpdateProfileRequestDto {
  @ApiPropertyOptional({
    description: "User's full name",
    example: "John Doe",
  })
  @IsString({ message: "Name must be a string." })
  @Length(1, 100, { message: "Name must be between 1 and 100 characters." })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: "The user's phone number",
    example: "0987654321",
    minLength: 10,
    maxLength: 11,
  })
  @IsString({ message: "Phone number must be a string." })
  @Length(10, 11, {
    message: "Phone number must be between 10 and 11 characters.",
  })
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: "User status",
    enum: UserStatus,
    enumName: "UserStatus",
    example: UserStatus.ACTIVE,
  })
  @IsIn(Object.values(UserStatus), {
    message: `Status must be one of: ${Object.values(UserStatus).join(", ")}`,
  })
  @IsOptional()
  status?: UserStatusType;

  @ApiPropertyOptional({
    description: "URL to user's avatar image",
    example: "https://example.com/avatars/johndoe.jpg",
  })
  @IsUrl({}, { message: "Avatar must be a valid URL." })
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: "Role ID to assign to the user",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID(4, { message: "Role ID must be a valid UUID v4." })
  roleId?: string;
}

export class UpdateProfileResponseDto {
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
    minLength: 10,
    maxLength: 11,
  })
  @Expose()
  phoneNumber: string;

  @ApiProperty({
    description: "URL to user's avatar image",
    example: "https://example.com/avatars/johndoe.jpg",
    type: String,
    nullable: true,
  })
  @Expose()
  avatar: string | null;

  @ApiProperty({
    description: "The user's status",
    example: UserStatus.ACTIVE,
    enum: UserStatus,
    enumName: "UserStatus",
  })
  @Expose()
  status: UserStatusType;

  @ApiProperty({
    description: "The user's role with associated permissions",
    type: () => RoleResponseDto,
  })
  @Expose()
  @Type(() => RoleResponseDto)
  role: RoleResponseDto;

  @ApiProperty({
    description: "The user's updated date",
    example: "2025-05-11T00:00:00.000Z",
    type: Date,
  })
  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<UpdateProfileResponseDto>) {
    Object.assign(this, partial);
  }
}

export class ChangePasswordRequestDto {
  @ApiProperty({
    description: "The user's current password",
    example: "currentPassword123",
    minLength: 8,
    maxLength: 20,
  })
  @IsString({ message: "Current password must be a string." })
  @Length(8, 20, {
    message:
      "Password must be at least 8 characters and at most 20 characters.",
  })
  currentPassword: string;

  @ApiProperty({
    description: "The user's new password",
    example: "newPassword123",
  })
  @IsString({ message: "New password must be a string." })
  @Length(8, 20, {
    message:
      "New password must be at least 8 characters and at most 20 characters.",
  })
  newPassword: string;

  @ApiProperty({
    description: "The user's new password confirmation",
    example: "newPassword123",
  })
  @IsString({ message: "New password confirmation must be a string." })
  @Length(8, 20, {
    message:
      "New password confirmation must be at least 8 characters and at most 20 characters.",
  })
  @IsPasswordMatch("newPassword")
  newConfirmPassword: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Password changed successfully.",
  })
  @Expose()
  message: string;

  constructor(partial: Partial<ChangePasswordResponseDto>) {
    Object.assign(this, partial);
  }
}
