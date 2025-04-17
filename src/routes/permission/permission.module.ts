import { Module } from "@nestjs/common";

import { PermissionController } from "./permission.controller";
import { PermissionService } from "./permission.service";

import { PermissionRepository } from "@/repositories/permission/permission.repository";

@Module({
  controllers: [PermissionController],
  providers: [PermissionService, PermissionRepository],
})
export class PermissionModule {}
