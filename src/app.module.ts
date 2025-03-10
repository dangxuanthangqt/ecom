import { Module } from "@nestjs/common";

import { RouteModule } from "./routes/route.module";
import { BaseModule } from "./shared/base.module";
import { SharedModule } from "./shared/shared.module";

@Module({
  imports: [SharedModule, BaseModule, RouteModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
