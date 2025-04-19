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
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { RoleService } from "./role.service";

import {
  CreateRoleRequestDto,
  DeleteRoleRequestDto,
  RoleListResponseDto,
  RoleResponseDto,
  UpdateRoleRequestDto,
} from "@/dto/role/role.dto";
import { PaginationRequestParamsDto } from "@/dto/shared/pagination.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";

@ApiTags("Roles")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Unauthorized" })
@ApiForbiddenResponse({ description: "Forbidden resource" })
@Controller("roles")
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiOperation({ summary: "Get roles" })
  @ApiOkResponse({
    description: "List of roles",
    type: RoleListResponseDto,
  })
  @ApiQuery({
    name: "pageSize",
    required: false,
    type: Number,
    description: "Number of items per page",
  })
  @ApiQuery({
    name: "pageIndex",
    required: false,
    type: Number,
    description: "Page index (starts from 0)",
  })
  @ApiQuery({
    name: "order",
    required: false,
    enum: ["ASC", "DESC"],
    description: "Sort order",
  })
  @ApiQuery({
    name: "orderBy",
    required: false,
    type: String,
    description: "Field to order by",
  })
  @ApiQuery({
    name: "keyword",
    required: false,
    type: String,
    description: "Search keyword",
  })
  @Get()
  async getRoles(
    @Query(new ValidationPipe({ transform: true }))
    query: PaginationRequestParamsDto,
  ) {
    const result = await this.roleService.getRoles(query);

    return new RoleListResponseDto(result);
  }

  @ApiOperation({ summary: "Get role by ID" })
  @ApiOkResponse({
    description: "Role details",
    type: RoleResponseDto,
  })
  @ApiNotFoundResponse({ description: "Role not found" })
  @ApiBadRequestResponse({ description: "Invalid ID" })
  @Get(":id")
  async getRoleById(@Param("id", ParseIntPipe) id: number) {
    const result = await this.roleService.getRoleById(id);

    return new RoleResponseDto(result);
  }

  @ApiOperation({ summary: "Create a new role" })
  @ApiCreatedResponse({
    description: "Role created",
    type: RoleResponseDto,
  })
  @ApiBadRequestResponse({ description: "Invalid request body" })
  @Post("create")
  async createRole(
    @Body() body: CreateRoleRequestDto,
    @ActiveUser("userId") userId: number,
  ) {
    const result = await this.roleService.createRole({
      body,
      userId,
    });

    return new RoleResponseDto(result);
  }

  @ApiOperation({ summary: "Update a role" })
  @ApiOkResponse({
    description: "Role updated",
    type: RoleResponseDto,
  })
  @ApiNotFoundResponse({ description: "Role not found" })
  @ApiBadRequestResponse({ description: "Invalid request body" })
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

    return new RoleResponseDto(result);
  }

  @ApiOperation({ summary: "Delete a role" })
  @ApiOkResponse({
    description: "Role deleted",
    type: RoleResponseDto,
  })
  @ApiNotFoundResponse({ description: "Role not found" })
  @ApiBadRequestResponse({ description: "Invalid request body" })
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

    return new RoleResponseDto(result);
  }
}
