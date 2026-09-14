import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { SharedModule } from "./shared/modules/shared.module";
import { AppConfigService } from "./shared/services/app-config.service";
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

  // The validation pipe and the exception filter are registered in `BaseModule`
  // via APP_PIPE / APP_FILTER, so every entry point that boots `AppModule` — the
  // server here, and the e2e harness — gets the identical error contract.

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
