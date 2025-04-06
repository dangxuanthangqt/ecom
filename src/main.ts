import {
  BadRequestException,
  HttpStatus,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
// import { TransformInterceptor } from "./shared/interceptors/transform.interceptor";
import { AppConfigService } from "./shared/services/app-config.service";
import { SharedModule } from "./shared/shared.module";
import { setupSwagger } from "./shared/utils/setup-swagger.util";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const configService = app.select(SharedModule).get(AppConfigService);

  // Enable CORS
  app.enableCors({
    origin: "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,

      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      // exceptionFactory: (errors) => {
      //   const transformedErrors = transformValidateObject(errors);

      //   return new ValidateException(transformedErrors);
      // },

      exceptionFactory: (errors) => {
        return new BadRequestException(
          errors.map((error) => {
            return {
              field: error.property,
              error: Object.values(error.constraints as object).join(", "),
            };
          }),
        );
      },
    }),
  );

  // app.useGlobalInterceptors(new TransformInterceptor());

  // app.useGlobalFilters(
  //   new PrismaClientExceptionFilter(),
  //   new ExternalExceptionFilter(),
  // ); not working with pipe ?

  // Setup Swagger
  if (configService.isDevelopment) {
    SwaggerModule.setup("api", app, setupSwagger(app), {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(configService.appConfig.port);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
