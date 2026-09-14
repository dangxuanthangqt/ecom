import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { App } from "supertest/types";

import { AppModule } from "src/app.module";

export type TestApp = INestApplication<App>;

/**
 * Boots a real `AppModule` the same way `main.ts` does, minus the two things
 * only a real server needs: CORS and `app.listen()`. `app.init()` alone
 * populates the express router, which is all supertest and
 * `syncRoutePermissions` read — no port is bound, so nothing collides across
 * spec files even under `--runInBand`.
 *
 * Nothing is configured here on purpose. The validation pipe and the global
 * exception filter are `APP_PIPE` / `APP_FILTER` providers inside `BaseModule`,
 * so importing `AppModule` is enough to get production's exact error contract —
 * there is no second copy of the pipe options to fall out of step.
 */
export async function createTestApp(): Promise<TestApp> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  await app.init();

  return app;
}

export async function closeTestApp(app: TestApp): Promise<void> {
  await app.close();
}
