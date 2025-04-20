import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

import { RoleResponseDto } from "../role/role.dto";

import { HTTPMethod, HTTPMethodType } from "@/constants/http-method.constant";

export class PermissionRequestDto {
  @ApiProperty({
    description: "Permission name",
    example: "Create User",
    minLength: 2,
    maxLength: 500,
  })
  @IsString()
  @Length(2, 500, {
    message: "Permission name must be between 2 and 500 characters.",
  })
  name: string;

  @ApiPropertyOptional({
    description: "Permission description",
    example: "Allows creating new users",
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Permission path",
    example: "/users",
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @Length(1, 1000, {
    message: "Path must be between 1 and 1000 characters.",
  })
  path: string;

  @ApiProperty({
    description: "Permission method",
    example: "POST",
    enum: HTTPMethod,
  })
  @IsIn(Object.values(HTTPMethod))
  method: HTTPMethodType;

  @ApiProperty({
    description: "Roles associated with the permission",
    example: [1, 2],
    type: [Number],
  })
  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true, message: "Roles must be an array of numbers." })
  roles?: number[]; // Array of role IDs to associate with the permission
}

export class CreatePermissionRequestDto extends PermissionRequestDto {}

export class UpdatePermissionRequestDto extends PermissionRequestDto {}

export class PermissionResponseDto {
  @ApiProperty({
    description: "Permission ID",
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: "Permission name",
    example: "Create User",
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: "Permission description",
    example: "Allows creating new users",
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: "Permission path",
    example: "/users",
  })
  @Expose()
  path: string;

  @ApiProperty({
    description: "Permission method",
    example: "POST",
  })
  @Expose()
  method: string;

  constructor(partial: Partial<PermissionResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PermissionWithRolesResponseDto extends PermissionResponseDto {
  @ApiPropertyOptional({
    description: "Roles associated with the permission",
    type: [RoleResponseDto],
    example: [
      {
        id: 1,
        name: "Admin",
        description: "Administrator role",
      },
    ],
  })
  @Expose()
  @Type(() => RoleResponseDto) // Transform nested roles into RoleDto objects
  roles?: RoleResponseDto[]; // Array of Role objects associated with the permission

  constructor(partial: Partial<PermissionWithRolesResponseDto>) {
    super(partial);
    Object.assign(this, partial);
  }
}

export class DeletePermissionRequestDto {
  @ApiPropertyOptional({
    description: "Whether to hard delete the permission",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isHardDelete?: boolean;
}
