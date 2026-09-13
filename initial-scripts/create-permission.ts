import { NestFactory } from "@nestjs/core";

import { AppModule } from "src/app.module";
import { PrismaService } from "src/shared/services/prisma.service";

import { syncRoutePermissions } from "./sync-route-permissions";

const prisma = new PrismaService();

/**
 * CLI entrypoint: `pnpm seed:initial-scripts:create-permission`. Boots the Nest
 * app just long enough to read its router (`app.init()` — no `listen()`, so no
 * port is bound and nothing collides with a real server), then delegates the
 * actual sync logic to `syncRoutePermissions`, which the e2e setup script also
 * calls directly with an app it already booted.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init();

  await syncRoutePermissions(app, prisma);

  await app.close();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
