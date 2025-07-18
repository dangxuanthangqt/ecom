import { Module } from "@nestjs/common";

import { PermissionRepository } from "@/repositories/permission/permission.repository";

import { PermissionController } from "./permission.controller";
import { PermissionService } from "./permission.service";

@Module({
  controllers: [PermissionController],
  providers: [PermissionService, PermissionRepository],
})
export class PermissionModule {}
