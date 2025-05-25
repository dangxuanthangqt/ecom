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
import { Role, User } from "@prisma/client";

import { UserService } from "./user.service";

import { PageDto } from "@/dtos/shared/page.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import {
  BaseUserResponseDto,
  CreateUserRequestDto,
  CreateUserResponseDto,
  UpdateUserRequestDto,
  UpdateUserResponseDto,
  UserItemResponseDto,
} from "@/dtos/user/user.dto";
import ActiveRolePermissions from "@/shared/decorators/active-role-permissions.decorator";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { ApiAuth, ApiPageOkResponse } from "@/shared/decorators/http-decorator";

@ApiTags("Users")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiPageOkResponse({
    summary: "Get a list of users",
    description: "Retrieve a list of users with pagination.",
    type: UserItemResponseDto,
  })
  async getUsers(
    @Query()
    query: PaginationQueryDto,
  ) {
    const result = await this.userService.getUsers(query);

    return new PageDto<UserItemResponseDto>(result);
  }

  @Get(":id")
  @ApiAuth({
    type: UserItemResponseDto,
    options: {
      summary: "Get a user by ID",
      description: "Retrieves a specific user by their ID.",
    },
  })
  @ApiParam({
    name: "id",
    description: "ID of the user to retrieve",
    type: String,
  })
  async getUserById(
    @Param("id", ParseUUIDPipe) userId: User["id"],
  ): Promise<UserItemResponseDto> {
    const result = await this.userService.getUserById(userId);

    return new UserItemResponseDto(result);
  }

  @Post()
  @ApiAuth({
    type: CreateUserResponseDto,
    options: {
      summary: "Create a new user.",
      description: "Creates a new user with the provided details.",
    },
  })
  async createUser(
    @Body() body: CreateUserRequestDto,
    @ActiveRolePermissions("id") activeRoleId: Role["id"],
    @ActiveUser("userId") activeUserId: User["id"],
  ): Promise<CreateUserResponseDto> {
    const result = await this.userService.createUser({
      body,
      activeRoleId,
      activeUserId,
    });

    return new CreateUserResponseDto(result);
  }

  @Put(":id")
  @ApiAuth({
    type: UpdateUserResponseDto,
    options: {
      summary: "Update an existing user.",
      description: "Updates the details of an existing user by ID.",
    },
  })
  @ApiParam({
    name: "id",
    description: "ID of the user to update",
    type: String,
  })
  async updateUser(
    @Body() body: UpdateUserRequestDto,
    @Param("id", ParseUUIDPipe) updatedUserId: User["id"],
    @ActiveUser("userId") activeUserId: User["id"],
    @ActiveRolePermissions("id") activeRoleId: Role["id"],
  ): Promise<UpdateUserResponseDto> {
    const result = await this.userService.updateUser({
      body,
      activeUserId,
      activeRoleId,
      updatedUserId,
    });

    return result;
  }

  @Delete(":id")
  @ApiAuth({
    type: UserItemResponseDto,
    options: {
      summary: "Delete a user by ID",
      description: "Deletes a user by their ID.",
    },
  })
  @ApiParam({
    name: "id",
    description: "ID of the user to delete",
    type: String,
  })
  async deleteUser(
    @Param("id", ParseUUIDPipe) deletedUserId: User["id"],
    @ActiveUser("userId") activeUserId: User["id"],
    @ActiveRolePermissions("id") activeRoleId: Role["id"],
  ): Promise<BaseUserResponseDto> {
    const result = await this.userService.deleteUser({
      activeRoleId,
      activeUserId,
      deletedUserId,
    });

    return new BaseUserResponseDto(result);
  }
}
