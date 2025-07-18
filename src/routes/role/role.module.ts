import { Module } from "@nestjs/common";

import { RoleRepository } from "@/repositories/role/role.repository";

import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

@Module({
  controllers: [RoleController],
  providers: [RoleRepository, RoleService],
})
export class RoleModule {}
