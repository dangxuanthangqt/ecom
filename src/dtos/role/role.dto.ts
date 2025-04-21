import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

import { PermissionResponseDto } from "../permission/permission.dto";

export class RoleResponseDto {
  @ApiProperty({
    description: "Role ID",
    example: 1,
  })
  @Expose()
  id: number;

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

  constructor(partial: Partial<RoleResponseDto>) {
    Object.assign(this, partial);
  }
}

export class RoleWithPermissionsResponseDto extends RoleResponseDto {
  @ApiPropertyOptional({
    description: "Permissions associated with the role",
    type: [PermissionResponseDto],
    example: [
      {
        id: 1,
        name: "Login",
        description: "Allows user to log in",
        path: "/login",
        method: "POST",
      } as PermissionResponseDto,
    ],
  })
  @Expose()
  @Type(() => PermissionResponseDto) // Transform nested permissions into PermissionDto objects
  permissions?: PermissionResponseDto[]; // Array of Permission objects associated with the role
  constructor(partial: Partial<RoleWithPermissionsResponseDto>) {
    super(partial);
    Object.assign(this, partial);
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
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber(
    {},
    { each: true, message: "Permissions must be an array of numbers" },
  )
  permissions?: number[];
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
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber(
    {},
    { each: true, message: "Permissions must be an array of numbers" },
  )
  permissions?: number[];
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
