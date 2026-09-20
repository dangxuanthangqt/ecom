import { Injectable, Logger } from "@nestjs/common";
import { Permission, Prisma } from "@prisma/client";

import { permissionWithRolesSelect } from "@/selectors/permission.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import { isRecordNotFoundPrismaError } from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class PermissionRepository {
  private logger = new Logger(PermissionRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Fetches multiple permissions based on the provided criteria.
   *
   * @param where - The filtering criteria for permissions.
   * @param take - The maximum number of permissions to return.
   * @param skip - The number of permissions to skip.
   * @param orderBy - The ordering criteria for the permissions.
   * @returns An object containing the fetched permissions and their count.
   */
  async findManyPermissions({
    where,
    take,
    skip,
    orderBy,
  }: {
    where?: Prisma.PermissionWhereInput;
    take?: number;
    skip?: number;
    orderBy?: Prisma.PermissionOrderByWithRelationInput;
  }) {
    try {
      const combinedWhere: Prisma.PermissionWhereInput = {
        ...where,
        deletedAt: null,
      };

      const [permissionsCount, permissions] =
        await this.prismaService.$transaction([
          this.prismaService.permission.count({
            where: combinedWhere,
          }),
          this.prismaService.permission.findMany({
            skip,
            take,
            orderBy,
            where: combinedWhere,
            select: permissionWithRolesSelect,
          }),
        ]);

      return {
        permissions,
        permissionsCount,
      };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch permissions.",
      });
    }
  }

  /**
   * Fetches a unique permission by its ID.
   *
   * @param id - The ID of the permission to fetch.
   * @returns The permission with its roles.
   */
  async findUniquePermission(id: Permission["id"]) {
    try {
      const permission = await this.prismaService.permission.findUniqueOrThrow({
        where: {
          id,
          deletedAt: null,
        },
        select: permissionWithRolesSelect,
      });

      return permission;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Permission not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to fetch permission.",
      });
    }
  }
}
