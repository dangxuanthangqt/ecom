import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User as UserSchema } from "@prisma/client";

import { ProfileService } from "./profile.service";

import { ProfileResponseDto } from "@/dtos/profile/profile.dto";
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
}
