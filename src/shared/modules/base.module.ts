import { ClassSerializerInterceptor, Module, Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
  DiscoveryModule,
  Reflector,
} from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { validateEnv } from "src/validations/env.validation";

import { GlobalExceptionFilter } from "../filters/global-exception.filter";
import { AccessTokenGuard } from "../guards/access-token.guard";
import { ApiKeyGuard } from "../guards/api-key.guard";
import { AppThrottlerGuard } from "../guards/app-throttler.guard";
import { AuthorizationHeaderGuard } from "../guards/authorization-header.guard";
import { AppConfigService } from "../services/app-config.service";
import { PermissionCoverageService } from "../services/permission-coverage.service";
import { ThrottlerRedisStorage } from "../services/throttler-redis-storage.service";
import { loggerFactory } from "../utils/setup-logger.util";
import { createThrottlerOptions } from "../utils/throttler-options.factory";
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

// Order matters: Nest runs global guards in registration order, and rate
// limiting has to come first. Behind the auth guard it would never see the
// flood of unauthenticated requests it exists to stop, and every rejected
// request would still have paid for a token verification first.
const guards: Provider[] = [
  AccessTokenGuard,
  ApiKeyGuard,
  {
    provide: APP_GUARD,
    useClass: AppThrottlerGuard,
  },
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
  // Boot-time gate: every non-public route must declare a permission.
  PermissionCoverageService,
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
    ThrottlerModule.forRootAsync({
      useFactory: (
        appConfigService: AppConfigService,
        storage: ThrottlerRedisStorage,
      ) =>
        createThrottlerOptions(
          appConfigService.appConfig.throttleEnabled,
          storage,
        ),
      inject: [AppConfigService, ThrottlerRedisStorage],
    }),
    I18nModule,
    // Exposes DiscoveryService + MetadataScanner for the permission coverage
    // check, which has to see every controller the app registered.
    DiscoveryModule,
  ],
  providers,
})
export class BaseModule {}
