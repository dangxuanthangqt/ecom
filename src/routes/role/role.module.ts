import { Module } from "@nestjs/common";

import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

import { RoleRepository } from "@/repositories/role/role.repository";

@Module({
  controllers: [RoleController],
  providers: [RoleRepository, RoleService],
})
export class RoleModule {}
