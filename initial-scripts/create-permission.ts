/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { PrismaService } from "src/shared/services/prisma.service";

import { HTTPMethod } from "@/constants/http-method.constant";
import { Role, RoleType } from "@/constants/role.constant";

const prisma = new PrismaService();

const SellerModule = [
  "AUTH",
  "MEDIA",
  "MANAGE-PRODUCT",
  "PRODUCT-TRANSLATIONS",
  "PROFILE",
];

const ClientModule = [
  "AUTH",
  "MEDIA",
  "PRODUCTS",
  "CATEGORIES",
  "BRANDS",
  "PRODUCT-TRANSLATIONS",
  "PROFILE",
];

const Module = {
  [Role.SELLER]: SellerModule,
  [Role.CLIENT]: ClientModule,
} as const;

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
        // console.log("moduleName", moduleName);
        return {
          path,
          method,
          name: `${method} ${path}`,
          module: moduleName,
        };
      }
    })
    .filter((item) => item !== undefined && Boolean(HTTPMethod[item.method]));

  console.log("availableRoutes", availableRoutes);

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

  const permissions = await prisma.permission.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      module: true,
      id: true,
    },
  });

  // Update permissions for each role
  const _updateResults = await Promise.all([
    updateRole({
      allPermissionIds: permissions,
      roleName: Role.SELLER,
    }),
    updateRole({
      allPermissionIds: permissions,
      roleName: Role.CLIENT,
    }),
    updateRole({
      allPermissionIds: permissions,
      roleName: Role.ADMIN,
    }),
  ]);

  // const result = {
  //   adminRole: updateResults.find((r) => r.name === Role.ADMIN),
  //   clientRole: updateResults.find((r) => r.name === Role.CLIENT),
  //   sellerRole: updateResults.find((r) => r.name === Role.SELLER),
  // };

  // console.log("result", result);

  await app.close();
}

const updateRole = async ({
  allPermissionIds,
  roleName,
}: {
  allPermissionIds: { id: string; module: string }[];
  roleName: RoleType;
}) => {
  let permissionIds = allPermissionIds.map((item) => item.id);

  const moduleList: string[] | undefined = Module[roleName];

  if (moduleList && moduleList.length > 0) {
    // Lấy ra các permissionId tương ứng với module
    permissionIds = allPermissionIds
      .filter((item) => moduleList.includes(item.module))
      .map((item) => item.id);

    if (permissionIds.length === 0) {
      console.log(`No permissions found for role: ${roleName}`);
      return;
    }
  }

  // Cập nhật lại các permissions trong Admin Role
  const role = await prisma.role.findFirstOrThrow({
    where: {
      name: roleName,
      deletedAt: null,
    },
  });

  await prisma.role.update({
    where: {
      id: role.id,
    },
    data: {
      permissions: {
        set: permissionIds.map((id) => ({
          id,
        })),
      },
    },
  });
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
