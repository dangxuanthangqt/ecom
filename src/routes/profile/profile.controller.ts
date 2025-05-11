import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User as UserSchema } from "@prisma/client";

import { ProfileService } from "./profile.service";

import {
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
  ProfileResponseDto,
  UpdateProfileRequestDto,
  UpdateProfileResponseDto,
} from "@/dtos/profile/profile.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { ApiAuth } from "@/shared/decorators/http-decorator";

@ApiTags("Profile")
@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiAuth({
    type: ProfileResponseDto,
    options: {
      summary: "Get current user profile.",
      description:
        "Retrieves the complete profile information for the authenticated user including role and permissions",
    },
  })
  async getProfile(@ActiveUser("userId") userId: UserSchema["id"]) {
    const result = await this.profileService.getProfile(userId);

    return new ProfileResponseDto(result);
  }

  @Put()
  @ApiAuth({
    type: ProfileResponseDto,
    options: {
      summary: "Update current user profile.",
      description:
        "Updates the profile information for the authenticated user including role and permissions",
    },
  })
  async updateProfile(
    @ActiveUser("userId") userId: UserSchema["id"],
    @Body() body: UpdateProfileRequestDto,
  ) {
    const result = await this.profileService.updateProfile({
      userId,
      data: body,
    });

    return new UpdateProfileResponseDto(result);
  }

  @ApiAuth({
    type: ProfileResponseDto,
    options: {
      summary: "Change current user password.",
      description: "Changes the password for the authenticated user.",
    },
  })
  @Put("change-password")
  async changePassword(
    @ActiveUser("userId") userId: UserSchema["id"],
    @Body() body: ChangePasswordRequestDto,
  ) {
    const result = await this.profileService.changePassword({
      userId,
      data: body,
    });

    return new ChangePasswordResponseDto(result);
  }
}
