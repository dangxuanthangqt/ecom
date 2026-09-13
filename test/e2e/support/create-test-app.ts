import { HttpStatus, INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { App } from "supertest/types";

import { AppModule } from "src/app.module";
import { ValidateException } from "src/shared/exceptions/validate.exception";
import { transformValidateObject } from "src/shared/utils/app.util";

export type TestApp = INestApplication<App>;

/**
 * Boots a real `AppModule` the same way `main.ts` does, minus the two things
 * only a real server needs: CORS and `app.listen()`. `app.init()` alone
 * populates the express router, which is all supertest and
 * `syncRoutePermissions` read — no port is bound, so nothing collides across
 * spec files even under `--runInBand`.
 *
 * `AppModule` already installs `nestjs-zod`'s `ZodValidationPipe` globally via
 * `APP_PIPE` (see `BaseModule`). `main.ts` additionally layers a
 * `class-validator` `ValidationPipe` with a `ValidateException` factory on
 * top — both must be present here too, or a spec asserting a validation-error
 * response body would see a different shape than production.
 */
export async function createTestApp(): Promise<TestApp> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      exceptionFactory: (errors) => {
        const transformedErrors = transformValidateObject(errors);

        return new ValidateException(transformedErrors);
      },
    }),
  );

  await app.init();

  return app;
}

export async function closeTestApp(app: TestApp): Promise<void> {
  await app.close();
}
