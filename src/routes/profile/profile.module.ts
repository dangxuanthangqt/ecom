import { Module } from "@nestjs/common";

import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

import { RoleRepository } from "@/repositories/role/role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, SharedUserRepository, RoleRepository],
})
export class ProfileModule {}
