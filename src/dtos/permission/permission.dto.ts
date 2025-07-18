import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from "class-validator";

import { HTTPMethod, HTTPMethodType } from "@/constants/http-method.constant";

import { RoleResponseDto } from "../role/role.dto";
import { PaginationQueryDto } from "../shared/pagination.dto";

import {
  PermissionOrderByFields,
  PermissionOrderByFieldsType,
} from "./constant";

export class PermissionPaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Field to order by",
    example: PermissionOrderByFields.CREATED_AT,
    enum: Object.values(PermissionOrderByFields),
  })
  @IsIn(Object.values(PermissionOrderByFields), {
    message: `orderBy must be one of: ${Object.values(PermissionOrderByFields).join(", ")}`,
  })
  @IsOptional()
  orderBy?: PermissionOrderByFieldsType;
}

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
    example: HTTPMethod.POST,
    enum: HTTPMethod,
  })
  @IsIn(Object.values(HTTPMethod))
  method: HTTPMethodType;

  @ApiProperty({
    description: "Roles associated with the permission",
    example: [
      "123e4567-e89b-12d3-a456-426614174000",
      "223e4567-e89b-12d3-a456-426614174001",
    ],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsUUID("4", {
    each: true,
    message: "Roles must be an array of valid UUIDs.",
  })
  rolesIds?: string[]; // Array of role UUIDs to associate with the permission
}

export class CreatePermissionRequestDto extends PermissionRequestDto {}

export class UpdatePermissionRequestDto extends PermissionRequestDto {}

export class PermissionResponseDto {
  @ApiProperty({
    description: "Permission ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Expose()
  id: string;

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

  @ApiProperty({
    description: "Permission module",
    example: "USER",
  })
  @Expose()
  module: string;

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
        id: "123e4567-e89b-12d3-a456-426614174000",
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
