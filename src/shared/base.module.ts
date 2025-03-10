import { ClassSerializerInterceptor, Module, Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE, Reflector } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { validateEnv } from "src/validations/env.validation";

import { ExternalExceptionFilter } from "./filters/external-exception.filter";
import { PrismaClientExceptionFilter } from "./filters/prisma-exception.filter";
import { AppConfigService } from "./services/app-config.service";
import { loggerFactory } from "./utils/setup-logger.util";

const filters: Provider[] = [
  {
    provide: APP_FILTER,
    useClass: PrismaClientExceptionFilter,
  },
  {
    provide: APP_FILTER,
    useClass: ExternalExceptionFilter,
  },
];

const serializerInterceptor: Provider = {
  provide: APP_INTERCEPTOR,
  useFactory: (reflector: Reflector) => {
    return new ClassSerializerInterceptor(reflector, {
      excludeExtraneousValues: true,
    });
  },
  inject: [Reflector],
};

const zodValidationPipe: Provider = {
  provide: APP_PIPE,
  useClass: ZodValidationPipe,
};

const zodSerializerInterceptor: Provider = {
  provide: APP_INTERCEPTOR,
  useClass: ZodSerializerInterceptor,
};

const providers: Provider[] = [
  ...filters,
  serializerInterceptor,

  /** Testing with zod */
  zodValidationPipe,
  zodSerializerInterceptor,
];
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
  providers,
})
export class BaseModule {}
