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

import { PageDto } from "@/dtos/shared/page.dto";
import {
  BaseUserResponseDto,
  CreateUserRequestDto,
  CreateUserResponseDto,
  UpdateUserRequestDto,
  UpdateUserResponseDto,
  UserItemResponseDto,
  UserPaginationQueryDto,
} from "@/dtos/user/user.dto";
import ActiveUserRole from "@/shared/param-decorators/active-user-role.decorator";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";

import { UserService } from "./user.service";

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
    query: UserPaginationQueryDto,
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
    @Param("id", ParseUUIDPipe) userId: UserSchema["id"],
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
    @ActiveUserRole("id") activeRoleId: RoleSchema["id"],
    @ActiveUser("userId") activeUserId: UserSchema["id"],
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
    @Param("id", ParseUUIDPipe) updatedUserId: UserSchema["id"],
    @ActiveUser("userId") activeUserId: UserSchema["id"],
    @ActiveUserRole("id") activeRoleId: RoleSchema["id"],
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
    @Param("id", ParseUUIDPipe) deletedUserId: UserSchema["id"],
    @ActiveUser("userId") activeUserId: UserSchema["id"],
    @ActiveUserRole("id") activeRoleId: RoleSchema["id"],
  ): Promise<BaseUserResponseDto> {
    const result = await this.userService.deleteUser({
      activeRoleId,
      activeUserId,
      deletedUserId,
    });

    return new BaseUserResponseDto(result);
  }
}
