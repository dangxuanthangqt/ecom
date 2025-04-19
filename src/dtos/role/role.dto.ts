import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

import { PaginationResponseDto } from "../shared/pagination.dto";

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

export class RoleListResponseDto {
  @ApiProperty({
    description: "List of roles",
    type: [RoleResponseDto],
  })
  @Expose()
  data: RoleResponseDto[];

  @ApiProperty({
    description: "Pagination information",
    type: PaginationResponseDto,
  })
  @Expose()
  @Type(() => PaginationResponseDto)
  pagination: PaginationResponseDto;

  constructor(partial: Partial<RoleListResponseDto>) {
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
