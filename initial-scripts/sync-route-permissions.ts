/* eslint-disable no-console */
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

import { HTTPMethod } from "@/constants/http-method.constant";
import { Role, RoleType } from "@/constants/role.constant";

const SellerModule = [
  "AUTH",
  "MEDIA",
  "MANAGE-PRODUCT",
  "PRODUCT-TRANSLATIONS",
  "PROFILE",
  "CART",
  "ORDERS",
  "MANAGE-ORDER",
  "REVIEWS",
];

const ClientModule = [
  "AUTH",
  "MEDIA",
  "PRODUCTS",
  "CATEGORIES",
  "BRANDS",
  "PRODUCT-TRANSLATIONS",
  "PROFILE",
  "CART",
  "ORDERS",
  "REVIEWS",
];

const Module = {
  [Role.SELLER]: SellerModule,
  [Role.CLIENT]: ClientModule,
} as const;

const updateRole = async ({
  prisma,
  allPermissionIds,
  roleName,
}: {
  prisma: PrismaClient;
  allPermissionIds: { id: string; module: string }[];
  roleName: RoleType;
}) => {
  let permissionIds = allPermissionIds.map((item) => item.id);

  // `Module` only declares SELLER/CLIENT keys (ADMIN keeps every permission,
  // by design — see the `moduleList` check below), so indexing it with the
  // wider `RoleType` is a real gap in `Module`'s type, not a mistake here;
  // carried over verbatim from the original inline implementation.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

/**
 * The one slice of Express's (untyped) internal router shape this module
 * reads. Narrower than pulling in `@types/express-serve-static-core`'s own
 * router internals (which are not part of its public type surface either),
 * and keeps every access here checked instead of falling back to `any`.
 */
interface ExpressRouterLayer {
  route?: {
    path: string;
    stack: Array<{ method: string }>;
  };
}

interface ExpressRouterHolder {
  router: {
    stack: ExpressRouterLayer[];
  };
}

/**
 * Derives `Permission` rows from the live Express router and re-links them to
 * ADMIN/CLIENT/SELLER. Requires an already-`init()`-ed Nest application so the
 * router (`app.getHttpAdapter().getInstance().router`) is populated — this is
 * the one piece of state neither `prisma/seed.ts` nor a bare `PrismaClient` can
 * produce on their own, which is why permission sync is a separate step from
 * seeding.
 *
 * Extracted verbatim from `initial-scripts/create-permission.ts` (formerly
 * inline in its `bootstrap()`), apart from taking `app`/`prisma` as
 * parameters instead of constructing them, so both the CLI entrypoint and the
 * e2e setup script share one implementation.
 */
export async function syncRoutePermissions(
  app: INestApplication,
  prisma: PrismaClient,
): Promise<void> {
  const server = app.getHttpAdapter().getInstance() as ExpressRouterHolder;
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
      if (!layer.route) {
        return undefined;
      }

      const path = layer.route.path;
      const method = String(layer.route.stack[0]?.method).toUpperCase();
      const moduleName = String(path.split("/")[1]).toUpperCase();

      return {
        path,
        method,
        name: `${method} ${path}`,
        module: moduleName,
      };
    })
    .filter(
      (
        item,
      ): item is {
        path: string;
        method: string;
        name: string;
        module: string;
      } =>
        item !== undefined &&
        Boolean(HTTPMethod[item.method as keyof typeof HTTPMethod]),
    ) as Array<{
    path: string;
    method: keyof typeof HTTPMethod;
    name: string;
    module: string;
  }>;

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

  await Promise.all([
    updateRole({
      prisma,
      allPermissionIds: permissions,
      roleName: Role.SELLER,
    }),
    updateRole({
      prisma,
      allPermissionIds: permissions,
      roleName: Role.CLIENT,
    }),
    updateRole({
      prisma,
      allPermissionIds: permissions,
      roleName: Role.ADMIN,
    }),
  ]);
}
