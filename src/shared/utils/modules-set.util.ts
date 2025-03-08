import { ModuleMetadata } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { validateEnv } from "src/validations/env.validation";

import { AppConfigService } from "../services/app-config.service";
import { SharedModule } from "../shared.module";

import { loggerFactory } from "./setup-logger.util";

export default function generateModulesSet(): ModuleMetadata["imports"] {
  console.log("process.env.APP_ENV", process.env.APP_ENV);
  const configModule = ConfigModule.forRoot({
    // isGlobal: true,
    validate: validateEnv,
    envFilePath: `.env.development`,
  });

  const loggerModule = LoggerModule.forRootAsync({
    // imports: [SharedModule],
    useFactory: loggerFactory,
    inject: [AppConfigService],
  });

  return [SharedModule, configModule, loggerModule];
}
