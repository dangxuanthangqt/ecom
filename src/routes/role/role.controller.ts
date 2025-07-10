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
import { Role as RoleSchema, User as UserSchema } from "@prisma/client";

import { RoleService } from "./role.service";

import {
  CreateRoleRequestDto,
  DeleteRoleRequestDto,
  RoleWithPermissionsResponseDto,
  UpdateRoleRequestDto,
} from "@/dtos/role/role.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";

@ApiTags("Roles")
@Controller("roles")
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiPageOkResponse({
    summary: "Get a list of roles",
    description: "Retrieve a list of roles with pagination.",
    type: RoleWithPermissionsResponseDto,
  })
  async getRoles(
    @Query()
    query: PaginationQueryDto,
  ): Promise<PageDto<RoleWithPermissionsResponseDto>> {
    const result = await this.roleService.getRoles(query);

    return new PageDto<RoleWithPermissionsResponseDto>(result);
  }

  @ApiAuth({
    type: RoleWithPermissionsResponseDto,
    options: {
      summary: "Get a role by ID",
      description: "Retrieve a role by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    type: String,
    description: "Role ID (UUID)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Get(":id")
  async getRoleById(
    @Param("id", ParseUUIDPipe) id: RoleSchema["id"],
  ): Promise<RoleWithPermissionsResponseDto> {
    const result = await this.roleService.getRoleById(id);

    return new RoleWithPermissionsResponseDto(result);
  }

  @ApiAuth({
    type: RoleWithPermissionsResponseDto,
    options: {
      summary: "Create a new role",
      description: "Create a new role with permissions.",
    },
  })
  @Post()
  async createRole(
    @Body() body: CreateRoleRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<RoleWithPermissionsResponseDto> {
    const result = await this.roleService.createRole({
      body,
      userId,
    });

    return new RoleWithPermissionsResponseDto(result);
  }

  @ApiAuth({
    type: RoleWithPermissionsResponseDto,
    options: {
      summary: "Update an existing role",
      description: "Update a role by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    type: String,
    description: "Role ID (UUID)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Put(":id")
  async updateRole(
    @Param("id", ParseUUIDPipe) id: RoleSchema["id"],
    @Body() body: UpdateRoleRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<RoleWithPermissionsResponseDto> {
    const result = await this.roleService.updateRole({
      id,
      body,
      userId,
    });

    return new RoleWithPermissionsResponseDto(result);
  }

  @ApiAuth({
    type: RoleWithPermissionsResponseDto,
    options: {
      summary: "Delete a role",
      description: "Delete a role by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    type: String,
    description: "Role ID (UUID)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Delete(":id")
  async deleteRole(
    @Param("id", ParseUUIDPipe) id: RoleSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
    @Body() body: DeleteRoleRequestDto,
  ): Promise<RoleWithPermissionsResponseDto> {
    const result = await this.roleService.deleteRole({
      id,
      userId,
      body,
    });

    return new RoleWithPermissionsResponseDto(result);
  }
}
