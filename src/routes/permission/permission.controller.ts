import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { User } from "@prisma/client";

import {
  CreatePermissionRequestDto,
  DeletePermissionRequestDto,
  PermissionPaginationQueryDto,
  PermissionWithRolesResponseDto,
  UpdatePermissionRequestDto,
} from "@/dtos/permission/permission.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";

import { PermissionService } from "./permission.service";

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
    query: PermissionPaginationQueryDto,
  ): Promise<PageDto<PermissionWithRolesResponseDto>> {
    const result = await this.permissionService.getPermissions(query);

    return new PageDto<PermissionWithRolesResponseDto>(result);
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
    type: String,
    description: "Permission ID (UUID)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  async getPermissionById(
    @Param("id", ParseUUIDPipe) id: string, // use ParseUUidPipe instead of custom PermissionIdParamDto like LanguageIdParamDto, so use @ApiParam to show example docs in Swagger
  ): Promise<PermissionWithRolesResponseDto> {
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
    @ActiveUser("userId") userId: User["id"],
  ): Promise<PermissionWithRolesResponseDto> {
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
    type: String,
    description: "Permission ID (UUID)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  async updatePermission(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdatePermissionRequestDto,
    @ActiveUser("userId") userId: User["id"],
  ): Promise<PermissionWithRolesResponseDto> {
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
    type: String,
    description: "Permission ID (UUID)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  async deletePermission(
    @Param("id", ParseUUIDPipe) id: string,
    @ActiveUser("userId") userId: User["id"],
    @Body() body: DeletePermissionRequestDto,
  ): Promise<PermissionWithRolesResponseDto> {
    const result = await this.permissionService.deletePermission({
      id,
      userId,
      body,
    });

    return new PermissionWithRolesResponseDto(result);
  }
}
