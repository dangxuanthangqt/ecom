import { NestFactory } from "@nestjs/core";

import { AppModule } from "src/app.module";
import { PrismaService } from "src/shared/services/prisma.service";
import { RolePermissionCacheService } from "src/shared/services/role-permission-cache.service";

import {
  seedSystemRoleGrants,
  syncPermissionCatalog,
} from "./sync-permission-catalog";

/**
 * CLI entrypoint: `pnpm seed:initial-scripts:create-permission`. Boots the Nest
 * app just long enough to read its controllers (`app.init()` — no `listen()`,
 * so no port is bound), syncs the permission catalogue from the
 * `@RequirePermission` declarations, then applies `RolePermissionMatrix` to the
 * three system roles. The e2e setup script runs this same entrypoint.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init();

  // The app's own client: it is built from the validated config, so there is
  // no second connection string to keep in step with `AppModule`.
  const prisma = app.get(PrismaService);

  await syncPermissionCatalog(app, prisma);
  await seedSystemRoleGrants(prisma, app.get(RolePermissionCacheService));

  await app.close();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
