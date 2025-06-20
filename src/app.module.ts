import { Module } from "@nestjs/common";

import { RouteModule } from "./routes/route.module";
import { BaseModule } from "./shared/modules/base.module";
import { SharedModule } from "./shared/modules/shared.module";

@Module({
  imports: [SharedModule, BaseModule, RouteModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
