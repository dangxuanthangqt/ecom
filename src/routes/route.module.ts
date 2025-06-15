import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { BrandModule } from "./brand/brand.module";
import { BrandTranslationModule } from "./brand-translation/brand-translation.module";
import { LanguageModule } from "./language/language.module";
import { MediaModule } from "./media/media.module";
import { PermissionModule } from "./permission/permission.module";
import { ProfileModule } from "./profile/profile.module";
import { RoleModule } from "./role/role.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [
    AuthModule,
    LanguageModule,
    PermissionModule,
    RoleModule,
    ProfileModule,
    UserModule,
    MediaModule,
    BrandModule,
    BrandTranslationModule,
  ],
})
export class RouteModule {}
