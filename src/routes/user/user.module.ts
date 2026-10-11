import { Module } from "@nestjs/common";

import { SharedUserRepository } from "@/repositories/user/shared-user.repository";

import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService, SharedUserRepository],
  exports: [],
})
export class UserModule {}
