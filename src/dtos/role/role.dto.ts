import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

import { PermissionResponseDto } from "../permission/permission.dto";
import { PaginationQueryDto } from "../shared/pagination.dto";

import { RoleOrderByFields, RoleOrderByFieldsType } from "./constants";

export class RolePaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Field to order by",
    example: RoleOrderByFields.CREATED_AT,
    enum: Object.values(RoleOrderByFields),
  })
  @IsIn(Object.values(RoleOrderByFields), {
    message: `orderBy must be one of: ${Object.values(RoleOrderByFields).join(", ")}`,
  })
  @IsOptional()
  orderBy?: RoleOrderByFieldsType;
}
export class RoleResponseDto {
  @ApiProperty({
    description: "Role ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "Role name",
    example: "Admin",
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: "Is role active",
    example: true,
  })
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({
    description: "Role description",
    example: "Administrator role",
  })
  @Expose()
  description: string;

  constructor(data?: RoleResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class RoleWithPermissionsResponseDto extends RoleResponseDto {
  @ApiProperty({
    description: "Permissions associated with the role",
    type: () => [PermissionResponseDto],
    example: [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Login",
        description: "Allows user to log in",
        path: "/login",
        method: "POST",
      },
    ],
  })
  @Expose()
  permissions: PermissionResponseDto[];

  constructor(data: RoleWithPermissionsResponseDto) {
    super();
    Object.assign(this, data);
  }
}

export class CreateRoleRequestDto {
  @ApiProperty({
    description: "Role name",
    example: "Admin",
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Role description",
    example: "Administrator role",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Is role active",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Permissions",
    example: [
      "123e4567-e89b-12d3-a456-426614174000",
      "223e4567-e89b-12d3-a456-426614174001",
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", {
    each: true,
    message: "Permissions must be an array of valid UUIDs",
  })
  permissionIds?: string[];
}

export class UpdateRoleRequestDto {
  @ApiProperty({
    description: "Role name",
    example: "Admin",
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Role description",
    example: "Administrator role",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Is role active",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Permissions",
    example: [
      "123e4567-e89b-12d3-a456-426614174000",
      "223e4567-e89b-12d3-a456-426614174001",
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", {
    each: true,
    message: "Permissions must be an array of valid UUIDs",
  })
  permissionIds?: string[];
}

export class DeleteRoleRequestDto {
  @ApiPropertyOptional({
    description: "Is hard delete",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isHardDelete?: boolean;
}
