import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { SharedModule } from "./shared/modules/shared.module";
import { AppConfigService } from "./shared/services/app-config.service";
import { setupSwagger } from "./shared/utils/setup-swagger.util";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const configService = app.select(SharedModule).get(AppConfigService);

  // Decides which address `req.ip` reports, and so which address the rate
  // limiter counts against. Trusting more hops than there really are in front
  // of the app lets a caller forge `X-Forwarded-For` and get a fresh limit
  // budget per request, so this defaults to trusting nothing.
  app.set("trust proxy", configService.appConfig.trustProxyHops);

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
