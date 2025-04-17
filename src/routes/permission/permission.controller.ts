import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from "@nestjs/swagger";

import { PermissionService } from "./permission.service";

import {
  CreatePermissionRequestDto,
  PermissionDeleteRequestDto,
  PermissionListResponseDto,
  PermissionResponseDto,
  UpdatePermissionRequestDto,
} from "@/dto/permission/permission.dto";
import { PaginationRequestParamsDto } from "@/dto/shared/pagination.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";

@ApiTags("permissions")
@Controller("permissions")
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: "Get a list of permissions" })
  @ApiOkResponse({
    description: "Successfully retrieved the list of permissions.",
    type: PermissionListResponseDto,
  })
  @ApiBadRequestResponse({ description: "Bad request." })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
  async getPermissions(
    @Query(new ValidationPipe({ transform: true }))
    query: PaginationRequestParamsDto,
  ) {
    const result = await this.permissionService.getPermissions(query);

    return new PermissionListResponseDto(result);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a permission by ID" })
  @ApiOkResponse({
    description: "Successfully retrieved the permission.",
    type: PermissionResponseDto,
  })
  @ApiNotFoundResponse({ description: "Permission not found." })
  @ApiBadRequestResponse({ description: "Bad request." })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
  async getPermissionById(@Param("id", ParseIntPipe) id: number) {
    const result = await this.permissionService.getPermissionById(id);

    return new PermissionResponseDto(result);
  }

  @Post("create")
  @ApiOperation({ summary: "Create a new permission" })
  @ApiOkResponse({
    description: "Successfully created the permission.",
    type: PermissionResponseDto,
  })
  @ApiBadRequestResponse({ description: "Bad request." })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
  async createPermission(
    @Body() body: CreatePermissionRequestDto,
    @ActiveUser("userId") userId: number,
  ) {
    const result = await this.permissionService.createPermission({
      body,
      userId,
    });

    return new PermissionResponseDto(result);
  }

  @Post("update/:id")
  @ApiOperation({ summary: "Update an existing permission" })
  @ApiOkResponse({
    description: "Successfully updated the permission.",
    type: PermissionResponseDto,
  })
  @ApiNotFoundResponse({ description: "Permission not found." })
  @ApiBadRequestResponse({ description: "Bad request." })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
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

    return new PermissionResponseDto(result);
  }

  @Delete("delete/:id")
  @ApiOperation({ summary: "Delete a permission" })
  @ApiOkResponse({
    description: "Successfully deleted the permission.",
    type: PermissionResponseDto,
  })
  @ApiNotFoundResponse({ description: "Permission not found." })
  @ApiBadRequestResponse({ description: "Bad request." })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
  async deletePermission(
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser("userId") userId: number,
    @Body() body: PermissionDeleteRequestDto,
  ) {
    const result = await this.permissionService.deletePermission({
      id,
      userId,
      body,
    });

    return new PermissionResponseDto(result);
  }
}
