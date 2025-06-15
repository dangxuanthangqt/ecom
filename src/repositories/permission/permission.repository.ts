import { Injectable, Logger } from "@nestjs/common";
import { Permission, Prisma, Role, User } from "@prisma/client";

import { permissionWithRolesSelect } from "@/selectors/permission.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isRecordToUpdateOrDeleteNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
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

  /**
   * Validates the provided roles against the database.
   *
   * @param roles - The array of role IDs to validate.
   * @throws HttpException if any of the roles are invalid.
   */
  async validateRoles(roles: Permission["id"][]) {
    const validRoles = await this.prismaService.role.findMany({
      where: {
        id: {
          in: roles,
        },
        deletedAt: null,
      },
    });

    if (validRoles.length !== roles.length) {
      this.logger.error(
        `Invalid roles provided. Expected: ${roles.toString()}, Found: ${validRoles.map((role) => role.id).toString()}`,
      );

      throwHttpException({
        type: "badRequest",
        message: "Invalid roles provided.",
        field: "roles",
      });
    }
  }

  /**
   * Creates a new permission with optional roles.
   *
   * @param data - The data to create the permission with.
   * @param rolesIds - Optional array of role IDs to connect.
   * @returns The created permission with its roles.
   */
  async createPermission({
    data,
    rolesIds,
  }: {
    data: Prisma.PermissionCreateArgs["data"];
    rolesIds?: Role["id"][];
  }) {
    if (rolesIds && rolesIds.length > 0) {
      await this.validateRoles(rolesIds);
    }

    try {
      const permission = await this.prismaService.permission.create({
        data: {
          ...data,
          roles: {
            connect: rolesIds?.map((id) => ({ id })),
          },
        },
        select: permissionWithRolesSelect,
      });

      return permission;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Permission already exists.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Invalid foreign key constraint.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create permission.",
      });
    }
  }

  /**
   * Updates an existing permission with optional roles.
   *
   * @param id - The ID of the permission to update.
   * @param data - The data to update the permission with.
   * @param rolesIds - Optional array of role IDs to connect.
   * @returns The updated permission with its roles.
   */
  async updatePermission({
    id,
    data,
    rolesIds,
  }: {
    id: Permission["id"];
    data: Prisma.PermissionUpdateArgs["data"];
    rolesIds?: Role["id"][];
  }) {
    if (rolesIds && rolesIds.length > 0) {
      await this.validateRoles(rolesIds);
    }

    try {
      const permission = await this.prismaService.permission.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          ...data,
          roles: {
            set: rolesIds?.map((roleId) => ({ id: roleId })),
          },
        },
        select: permissionWithRolesSelect,
      });

      return permission;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Permission ${id} not found or already deleted.`,
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Permission already exists.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Invalid foreign key constraint.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update permission.",
      });
    }
  }

  /**
   * Deletes a permission by its ID.
   *
   * @param id - The ID of the permission to delete.
   * @param isHardDelete - Whether to perform a hard delete (true) or soft delete (false).
   * @param userId - The ID of the user performing the deletion.
   * @returns The deleted permission with its roles.
   */
  async deletePermission({
    id,
    isHardDelete,
    userId,
  }: {
    id: Permission["id"];
    isHardDelete?: boolean;
    userId: User["id"];
  }) {
    try {
      if (isHardDelete) {
        const permission = await this.prismaService.permission.delete({
          where: {
            id,
            deletedAt: null,
          },
          select: permissionWithRolesSelect,
        });

        return permission;
      }

      const permission = await this.prismaService.permission.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
          updatedById: userId,
        },
        select: permissionWithRolesSelect,
      });

      return permission;
    } catch (error) {
      this.logger.error(error);

      /** Delete and Update not found record */
      if (isRecordToUpdateOrDeleteNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Permission ${id} not found or already deleted.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to delete permission.",
      });
    }
  }
}
