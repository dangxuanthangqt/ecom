import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";

import { PermissionService } from "./permission.service";

import {
  CreatePermissionRequestDto,
  DeletePermissionRequestDto,
  PermissionWithRolesResponseDto,
  UpdatePermissionRequestDto,
} from "@/dto/permission/permission.dto";
import { PageDto } from "@/dto/shared/page.dto";
import { PaginationQueryDto } from "@/dto/shared/pagination.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { ApiAuth, ApiPageOkResponse } from "@/shared/decorators/http-decorator";

@ApiTags("Permissions")
@Controller("permissions")
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiPageOkResponse({
    summary: "Get a list of permissions",
    description: "Retrieve a list of permissions with pagination.",
    type: PermissionWithRolesResponseDto,
  })
  async getPermissions(
    @Query()
    query: PaginationQueryDto,
  ) {
    const result = await this.permissionService.getPermissions(query);

    return new PageDto(result);
  }

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
    type: Number,
    description: "Permission ID",
    required: true,
    example: 1,
  })
  async getPermissionById(@Param("id", ParseIntPipe) id: number) {
    const result = await this.permissionService.getPermissionById(id);

    return new PermissionWithRolesResponseDto(result);
  }

  @Post()
  @ApiAuth({
    type: PermissionWithRolesResponseDto,
    options: {
      summary: "Create a new permission",
      description: "Create a new permission with associated roles.",
    },
  })
  async createPermission(
    @Body() body: CreatePermissionRequestDto,
    @ActiveUser("userId") userId: number,
  ) {
    const result = await this.permissionService.createPermission({
      body,
      userId,
    });

    return new PermissionWithRolesResponseDto(result);
  }

  @Put(":id")
  @ApiAuth({
    type: PermissionWithRolesResponseDto,
    options: {
      summary: "Update a permission",
      description: "Update an existing permission by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    type: Number,
    description: "Permission ID",
    required: true,
    example: 1,
  })
  async updatePermission(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdatePermissionRequestDto,
    @ActiveUser("userId") userId: number,
  ) {
    const result = await this.permissionService.updatePermission({
      id,
      body,
      userId,
    });

    return new PermissionWithRolesResponseDto(result);
  }

  @Delete(":id")
  @ApiAuth({
    type: PermissionWithRolesResponseDto,
    options: {
      summary: "Delete a permission",
      description: "Delete a specific permission by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    type: Number,
    description: "Permission ID",
    required: true,
    example: 1,
  })
  async deletePermission(
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser("userId") userId: number,
    @Body() body: DeletePermissionRequestDto,
  ) {
    const result = await this.permissionService.deletePermission({
      id,
      userId,
      body,
    });

    return new PermissionWithRolesResponseDto(result);
  }
}
