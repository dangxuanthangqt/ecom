/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { PrismaService } from "src/shared/services/prisma.service";

import { HTTPMethod } from "@/constants/http-method.constant";
import { Role } from "@/constants/role.constant";

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
    module: string;
  }> = router.stack
    .map((layer) => {
      if (layer.route) {
        const path = layer.route?.path;
        const method = String(layer.route?.stack[0].method).toUpperCase();

        const moduleName = String(path.split("/")[1]).toUpperCase();

        return {
          path,
          method,
          name: `${method} ${path}`,
          module: moduleName,
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

  if (permissionsToAdd.length > 0) {
    const addResult = await prisma.permission.createMany({
      data: permissionsToAdd,
      skipDuplicates: true,
    });
    console.log("Added permission: ", addResult.count);
  }

  const adminRole = await prisma.role.findFirstOrThrow({
    where: {
      name: Role.ADMIN,
      deletedAt: null,
    },
  });

  const permissions = await prisma.permission.findMany({
    where: {
      deletedAt: null,
    },
  });

  const result = await prisma.role.update({
    where: {
      id: adminRole.id,
      deletedAt: null,
    },
    data: {
      permissions: {
        set: permissions.map((item) => ({
          id: item.id,
        })),
      },
    },
    include: {
      permissions: true,
    },
  });

  console.log("result", result);

  await app.close();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
