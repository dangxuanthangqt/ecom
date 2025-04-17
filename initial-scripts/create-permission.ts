/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { PrismaService } from "src/shared/services/prisma.service";

import { HTTPMethod } from "@/constants/http-method.constant";

const prisma = new PrismaService();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3010);

  const server = app.getHttpAdapter().getInstance();

  const router = server.router;

  const permissionsInDb = await prisma.permission.findMany({
    where: {
      deletedAt: null,
    },
  });

  const availableRoutes: Array<{
    path: string;
    method: keyof typeof HTTPMethod;
    name: string;
  }> = router.stack
    .map((layer) => {
      if (layer.route) {
        const path = layer.route?.path;
        const method = String(layer.route?.stack[0].method).toUpperCase();
        return {
          path,
          method,
          name: `${method} ${path}`,
        };
      }
    })
    .filter((item) => item !== undefined && Boolean(HTTPMethod[item.method]));

  const formattedAvailableRoutes = availableRoutes.map(
    (item) => `${item.method}-${item.path}`,
  );

  const formattedPermissionsInDb = permissionsInDb.map(
    (item) => `${item.method}-${item.path}`,
  );

  const permissionToDelete = permissionsInDb.filter((item) => {
    return !formattedAvailableRoutes.includes(`${item.method}-${item.path}`);
  });

  if (permissionToDelete.length > 0) {
    const deletedResult = await prisma.permission.deleteMany({
      where: {
        id: {
          in: permissionToDelete.map((item) => item.id),
        },
      },
    });

    console.log("Deleted permissions: ", deletedResult.count);
  }

  const permissionsToAdd = availableRoutes.filter((item) => {
    return !formattedPermissionsInDb.includes(`${item.method}-${item.path}`);
  });
  // console.log("permissionsToAdd", permissionsToAdd);
  if (permissionsToAdd.length > 0) {
    const addResult = await prisma.permission.createMany({
      data: permissionsToAdd,
      skipDuplicates: true,
    });
    console.log("Added permission: ", addResult.count);
  }

  process.exit(0);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
