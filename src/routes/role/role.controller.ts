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

import { RoleService } from "./role.service";

import {
  CreateRoleRequestDto,
  DeleteRoleRequestDto,
  RoleWithPermissionsResponseDto,
  UpdateRoleRequestDto,
} from "@/dto/role/role.dto";
import { PageDto } from "@/dto/shared/page.dto";
import { PaginationQueryDto } from "@/dto/shared/pagination.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { ApiAuth, ApiPageOkResponse } from "@/shared/decorators/http-decorator";

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
  ) {
    const result = await this.roleService.getRoles(query);

    return new PageDto(result);
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
    type: Number,
    description: "Role ID",
    required: true,
    example: 1,
  })
  @Get(":id")
  async getRoleById(@Param("id", ParseIntPipe) id: number) {
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
    @ActiveUser("userId") userId: number,
  ) {
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
    type: Number,
    description: "Role ID",
    required: true,
    example: 1,
  })
  @Put(":id")
  async updateRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateRoleRequestDto,
    @ActiveUser("userId") userId: number,
  ) {
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
    type: Number,
    description: "Role ID",
    required: true,
    example: 1,
  })
  @Delete(":id")
  async deleteRole(
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser("userId") userId: number,
    @Body() body: DeleteRoleRequestDto,
  ) {
    const result = await this.roleService.deleteRole({
      id,
      userId,
      body,
    });

    return new RoleWithPermissionsResponseDto(result);
  }
}
