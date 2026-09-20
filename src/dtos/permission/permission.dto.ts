import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsIn, IsOptional } from "class-validator";

import { RoleResponseDto } from "../role/role.dto";
import { PaginationQueryDto } from "../shared/pagination.dto";

import {
  PermissionOrderByFields,
  PermissionOrderByFieldsType,
} from "./constant";

/**
 * Permissions are read-only over HTTP. The catalogue is declared in code with
 * `@RequirePermission` and synced into the database; creating or editing a row
 * through the API would produce a key no handler references, or rewrite one a
 * handler does. Grants are edited on the role side (`PUT /roles/:id`).
 */
export class PermissionPaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Field to order by",
    example: PermissionOrderByFields.KEY,
    enum: Object.values(PermissionOrderByFields),
  })
  @IsIn(Object.values(PermissionOrderByFields), {
    message: `orderBy must be one of: ${Object.values(PermissionOrderByFields).join(", ")}`,
  })
  @IsOptional()
  orderBy?: PermissionOrderByFieldsType;
}

export class PermissionResponseDto {
  @ApiProperty({
    description: "Permission ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "Stable key of the form resource:action:scope",
    example: "product:update:own",
  })
  @Expose()
  key: string;

  @ApiProperty({ description: "Business capability", example: "product" })
  @Expose()
  resource: string;

  @ApiProperty({ description: "Operation on the resource", example: "update" })
  @Expose()
  action: string;

  @ApiProperty({
    description: "own = caller's records only, any = unrestricted",
    example: "own",
    enum: ["own", "any"],
  })
  @Expose()
  scope: string;

  @ApiPropertyOptional({
    description: "Permission description",
    example: "Update products the caller created",
  })
  @Expose()
  description?: string;

  constructor(partial: Partial<PermissionResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PermissionWithRolesResponseDto extends PermissionResponseDto {
  @ApiPropertyOptional({
    description: "Roles holding this permission",
    type: [RoleResponseDto],
    example: [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "admin",
        description: "Admin role",
      },
    ],
  })
  @Expose()
  @Type(() => RoleResponseDto)
  roles?: RoleResponseDto[];

  constructor(partial: Partial<PermissionWithRolesResponseDto>) {
    super(partial);
    Object.assign(this, partial);
  }
}
