import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { validateEnv } from "src/validations/env.validation";

import { AppConfigService } from "./services/app-config.service";
import { loggerFactory } from "./utils/setup-logger.util";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // This is important to make the configuration available in the whole application
      validate: validateEnv,
      envFilePath: `.env.${process.env.APP_ENV}`,
    }),
    LoggerModule.forRootAsync({
      useFactory: loggerFactory,
      inject: [AppConfigService], // In SharedModule, we have exported AppConfigService
    }),
  ],
})
export class BaseModule {}
