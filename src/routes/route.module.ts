import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { LanguageModule } from "./language/language.module";
import { PermissionModule } from "./permission/permission.module";

@Module({
  imports: [AuthModule, LanguageModule, PermissionModule],
})
export class RouteModule {}
