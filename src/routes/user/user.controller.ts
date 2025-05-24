import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { User } from "@prisma/client";

import { UserService } from "./user.service";

import {
  CreateUserRequestDto,
  CreateUserResponseDto,
  UpdateUserRequestDto,
  UpdateUserResponseDto,
} from "@/dtos/user/user.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { ApiAuth } from "@/shared/decorators/http-decorator";

@ApiTags("Users")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

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
    @ActiveUser("userId") activeUserId: User["id"],
  ) {
    const result = await this.userService.createUser({
      body,
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
    @ActiveUser("roleId") activeUserRoleId: User["roleId"],
  ) {
    const result = await this.userService.updateUser({
      body,
      activeUserId,
      activeUserRoleId,
      updatedUserId,
    });

    return new UpdateUserResponseDto(result);
  }
}
