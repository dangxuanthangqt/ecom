import { INestApplication } from "@nestjs/common";
import { Test, TestingModuleBuilder } from "@nestjs/testing";
import { App } from "supertest/types";

import { AppModule } from "src/app.module";

export type TestApp = INestApplication<App>;

/**
 * Boots a real `AppModule` the same way `main.ts` does, minus the two things
 * only a real server needs: CORS and `app.listen()`. `app.init()` alone
 * populates the express router, which is all supertest and
 * the permission catalogue sync read — no port is bound, so nothing collides across
 * spec files even under `--runInBand`.
 *
 * One thing `main.ts` does that this deliberately does not: `app.set("trust
 * proxy", ...)`. Specs therefore run under express's default of trusting no
 * proxy, so `req.ip` is always the socket address and `X-Forwarded-For` is
 * ignored. A spec that tried to prove an IP-based limit cannot be spoofed would
 * pass here for the wrong reason — that belongs in a test that boots the app the
 * way `main.ts` does.
 *
 * Nothing is configured here on purpose. The validation pipe and the global
 * exception filter are `APP_PIPE` / `APP_FILTER` providers inside `BaseModule`,
 * so importing `AppModule` is enough to get production's exact error contract —
 * there is no second copy of the pipe options to fall out of step.
 */
export async function createTestApp(
  /**
   * Optional hook to override providers before the module is compiled.
   *
   * Needed for anything configured at module-definition time:
   * `ConfigModule.forRoot()` snapshots `process.env` when `base.module.ts` is
   * first imported, which is before any `beforeAll` runs — so a spec cannot
   * change app configuration by assigning to `process.env`. Overriding the
   * provider is the only way in.
   */
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<TestApp> {
  const builder = Test.createTestingModule({
    imports: [AppModule],
  });

  const moduleFixture = await (
    configure ? configure(builder) : builder
  ).compile();

  const app = moduleFixture.createNestApplication();

  await app.init();

  return app;
}

export async function closeTestApp(app: TestApp): Promise<void> {
  await app.close();
}
