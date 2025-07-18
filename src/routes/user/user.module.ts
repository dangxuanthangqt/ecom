import { Module } from "@nestjs/common";

import { RoleRepository } from "@/repositories/role/role.repository";
import { SharedRoleRepository } from "@/repositories/role/shared-role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";

import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [],
  controllers: [UserController],
  providers: [
    UserService,
    SharedUserRepository,
    SharedRoleRepository,
    RoleRepository,
  ],
  exports: [],
})
export class UserModule {}
