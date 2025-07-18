import { Module } from "@nestjs/common";

import { RoleRepository } from "@/repositories/role/role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";

import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, SharedUserRepository, RoleRepository],
})
export class ProfileModule {}
