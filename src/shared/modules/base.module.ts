import { ClassSerializerInterceptor, Module, Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
  Reflector,
} from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";

import { validateEnv } from "src/validations/env.validation";

import { GlobalExceptionFilter } from "../filters/global-exception.filter";
import { AccessTokenGuard } from "../guards/access-token.guard";
import { ApiKeyGuard } from "../guards/api-key.guard";
import { AuthorizationHeaderGuard } from "../guards/authorization-header.guard";
import { AppConfigService } from "../services/app-config.service";
import { loggerFactory } from "../utils/setup-logger.util";
import { createValidationPipe } from "../utils/validation-pipe.config";

import { I18nModule } from "./i18n.module";

// One filter owns every error response. See `GlobalExceptionFilter` for why this
// is deliberately not a list.
const filters: Provider[] = [
  {
    provide: APP_FILTER,
    useClass: GlobalExceptionFilter,
  },
];

const guards: Provider[] = [
  AccessTokenGuard,
  ApiKeyGuard,
  {
    provide: APP_GUARD,
    useClass: AuthorizationHeaderGuard,
  },
]; // AccessTokenGuard & ApiKeyGuard can inject into AuthorizationHeaderGuard, no need to export them

const serializerInterceptor: Provider = {
  provide: APP_INTERCEPTOR,
  useFactory: (reflector: Reflector) => {
    return new ClassSerializerInterceptor(reflector, {
      excludeExtraneousValues: true,
    });
  },
  inject: [Reflector],
};

const validationPipe: Provider = {
  provide: APP_PIPE,
  useFactory: createValidationPipe,
};

const providers: Provider[] = [
  ...filters,
  ...guards,
  serializerInterceptor,
  validationPipe,
];
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // This is important to make the configuration available in the whole application , register ConfigService as global
      validate: validateEnv,
      envFilePath: [`.env.${process.env.NODE_ENV}`, ".env"],
    }),
    LoggerModule.forRootAsync({
      useFactory: loggerFactory,
      inject: [AppConfigService], // In SharedModule, we have exported AppConfigService
    }),
    I18nModule,
  ],
  providers,
})
export class BaseModule {}
