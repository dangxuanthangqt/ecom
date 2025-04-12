import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { LanguageModule } from "./language/language.module";

@Module({
  imports: [AuthModule, LanguageModule],
})
export class RouteModule {}
