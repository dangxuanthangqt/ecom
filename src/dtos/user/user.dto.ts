import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsEmail,
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

export class UserResponseDto {
  @ApiProperty({
    description: "The user's ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "The user's name",
    example: "John Doe",
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: "The user's email address",
    example: "user@example.com",
    format: "email",
  })
  @Expose()
  email: string;

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
    description: "User's role with associated permissions",
    type: () => RoleWithPermissionsResponseDto,
  })
  @Expose()
  @Type(() => RoleWithPermissionsResponseDto)
  role: RoleWithPermissionsResponseDto;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}

export class CreateUserResponseDto extends UserResponseDto {}

export class UpdateUserResponseDto extends PickType(UserResponseDto, [
  "id",
  "name",
  "email",
  "phoneNumber",
  "avatar",
  "status",
] as const) {
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

  constructor(partial: Partial<UpdateUserResponseDto>) {
    super();
    Object.assign(this, partial);
  }
}

export class UserRequestDto {
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
    description: "User's full name",
    example: "John Doe",
  })
  @IsString({ message: "Name must be a string." })
  @Length(1, 100, { message: "Name must be between 1 and 100 characters." })
  name: string;

  @ApiProperty({
    description: "The user's phone number",
    example: "0987654321",
    minLength: 10,
    maxLength: 11,
  })
  @IsString({ message: "Phone number must be a string." })
  @Length(10, 11, {
    message: "Phone number must be between 10 and 11 characters.",
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: "URL to user's avatar image",
    example: "https://example.com/avatars/johndoe.jpg",
  })
  @IsOptional()
  @IsUrl({}, { message: "Avatar must be a valid URL." })
  avatar?: string;

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
    description: "Role ID to assign to the user",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID(4, { message: "Role ID must be a valid UUID v4." })
  roleId?: string;
}

export class CreateUserRequestDto extends UserRequestDto {}

export class UpdateUserRequestDto extends PickType(
  PartialType(UserRequestDto),
  ["avatar", "name", "phoneNumber", "password", "roleId", "status"] as const,
) {}
