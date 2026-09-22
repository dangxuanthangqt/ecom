import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";

import {
  PermissionPaginationQueryDto,
  PermissionWithRolesResponseDto,
} from "@/dtos/permission/permission.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";
import { RequirePermission } from "@/shared/param-decorators/require-permission.decorator";

import { PermissionService } from "./permission.service";

/**
 * Read-only. The permission catalogue is owned by code (`@RequirePermission`
 * declarations synced by `pnpm seed:initial-scripts:create-permission`); what a
 * role may do is edited through `PUT /roles/:id`.
 */
@ApiTags("Permissions")
@Controller("permissions")
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @RequirePermission("permission:read:any")
  @Get()
  @ApiPageOkResponse({
    summary: "Get a list of permissions",
    description: "Retrieve the permission catalogue with pagination.",
    type: PermissionWithRolesResponseDto,
  })
  async getPermissions(
    @Query()
    query: PermissionPaginationQueryDto,
  ): Promise<PageDto<PermissionWithRolesResponseDto>> {
    const result = await this.permissionService.getPermissions(query);

    return new PageDto<PermissionWithRolesResponseDto>(result);
  }

  @RequirePermission("permission:read:any")
  @Get(":id")
  @ApiAuth({
    type: PermissionWithRolesResponseDto,
    options: {
      summary: "Get a permission by ID",
      description: "Retrieve a specific permission by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    type: String,
    description: "Permission ID (UUID)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  async getPermissionById(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<PermissionWithRolesResponseDto> {
    const result = await this.permissionService.getPermissionById(id);

    return new PermissionWithRolesResponseDto(result);
  }
}
