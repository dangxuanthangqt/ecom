import { Module } from "@nestjs/common";

import { BaseModule } from "./shared/base.module";
import { SharedModule } from "./shared/shared.module";

@Module({
  imports: [SharedModule, BaseModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
