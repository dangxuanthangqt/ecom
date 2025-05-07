import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { LanguageModule } from "./language/language.module";
import { PermissionModule } from "./permission/permission.module";
import { ProfileModule } from "./profile/profile.module";
import { RoleModule } from "./role/role.module";

@Module({
  imports: [
    AuthModule,
    LanguageModule,
    PermissionModule,
    RoleModule,
    ProfileModule,
  ],
})
export class RouteModule {}
