import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RoleService } from "./role.service";

import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { UserRepository } from "@/repositories/user/user.repository";

@Module({
  controllers: [AuthController],
  providers: [RoleService, AuthService, UserRepository, SharedUserRepository],
  exports: [SharedUserRepository],
})
export class AuthModule {}
