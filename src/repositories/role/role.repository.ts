import { Injectable, Logger } from "@nestjs/common";
import { Permission, Prisma, Role, User } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";
import { roleWithPermissionsSelect } from "src/selectors/role.selector";

@Injectable()
export class RoleRepository {
  private logger = new Logger(RoleRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Fetches multiple roles that are not deleted.
   *
   * @returns An object containing the fetched roles and their count.
   */
  async findManyRoles({
    where,
    take,
    skip,
    orderBy,
  }: Pick<Prisma.RoleFindManyArgs, "where" | "take" | "skip" | "orderBy">) {
    const combinedWhere: Prisma.RoleWhereInput = {
      ...where,
      deletedAt: null,
    };

    try {
      const $roles = this.prismaService.role.findMany({
        where: combinedWhere,
        take,
        skip,
        orderBy,
        select: roleWithPermissionsSelect,
      });

      const $rolesCount = this.prismaService.role.count({
        where: combinedWhere,
      });

      const [rolesCount, roles] = await Promise.all([$rolesCount, $roles]);

      return { roles, rolesCount };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch roles.",
      });
    }
  }

  /**
   * Fetches a unique role by its ID.
   *
   * @param id - The ID of the role to fetch.
   * @returns The role with its permissions.
   */
  async findUniqueRole(id: Role["id"]) {
    try {
      const role = await this.prismaService.role.findUniqueOrThrow({
        where: { id, deletedAt: null },
        select: roleWithPermissionsSelect,
      });

      return role;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Role not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to fetch role.",
      });
    }
  }

  /**
   * Validates the provided permissions against the database.
   *
   * @param permissions - The array of permission IDs to validate.
   * @throws HttpException if any of the permissions are invalid.
   */
  private async validatePermissions(permissions: Permission["id"][]) {
    const validPermissions = await this.prismaService.permission.findMany({
      where: {
        id: {
          in: permissions,
        },
        deletedAt: null,
      },
    });

    if (validPermissions.length !== permissions.length) {
      this.logger.error(
        `Invalid permissions provided: ${JSON.stringify(permissions)}`,
      );

      throwHttpException({
        type: "badRequest",
        message: "Invalid permissions provided.",
        field: "permissions",
      });
    }
  }

  /**
   * Creates a new role with optional permissions.
   *
   * @param data - The data to create the role with.
   * @param permissionIds - Optional array of permission IDs to connect.
   * @returns The created role with its permissions.
   */
  async createRole({
    data,
    permissionIds,
  }: {
    data: Prisma.RoleCreateArgs["data"];
    permissionIds?: Permission["id"][];
  }) {
    if (permissionIds && permissionIds.length > 0) {
      await this.validatePermissions(permissionIds);
    }

    try {
      const role = await this.prismaService.role.create({
        data: {
          ...data,
          permissions: {
            connect: permissionIds?.map((permissionId) => ({
              id: permissionId,
            })),
          },
        },
        select: roleWithPermissionsSelect,
      });

      return role;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Role already exists.",
          field: "role",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Foreign key constraint violation.",
          field: "role",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create role.",
      });
    }
  }

  /**
   * Updates an existing role with optional permissions.
   *
   * @param id - The ID of the role to update.
   * @param data - The data to update the role with.
   * @param permissionIds - Optional array of permission IDs to connect.
   * @returns The updated role with its permissions.
   */
  async updateRole({
    id,
    data,
    permissionIds,
  }: {
    id: Role["id"];
    data: Prisma.RoleUpdateArgs["data"];
    permissionIds?: Permission["id"][];
  }) {
    if (permissionIds && permissionIds.length > 0) {
      await this.validatePermissions(permissionIds);
    }

    try {
      const role = await this.prismaService.role.update({
        where: { id, deletedAt: null },
        data: {
          ...data,
          permissions: {
            set: permissionIds?.map((permissionId) => ({
              id: permissionId,
            })),
          },
        },
        select: roleWithPermissionsSelect,
      });

      return role;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Role not found.",
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Role already exists.",
          field: "role",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Foreign key constraint violation.",
          field: "role",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update role.",
      });
    }
  }

  /**
   * Deletes a role by its ID.
   *
   * @param id - The ID of the role to delete.
   * @param userId - The ID of the user performing the deletion.
   * @param isHardDelete - Whether to perform a hard delete (true) or soft delete (false).
   * @returns The deleted role with its permissions.
   */
  async deleteRole({
    id,
    userId,
    isHardDelete,
  }: {
    id: Role["id"];
    userId: User["id"];
    isHardDelete?: boolean;
  }) {
    try {
      if (isHardDelete) {
        const deletedRole = await this.prismaService.role.delete({
          where: { id },
          select: roleWithPermissionsSelect,
        });

        return deletedRole;
      }

      const updatedRole = await this.prismaService.role.update({
        where: { id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
        },
        select: roleWithPermissionsSelect,
      });

      return updatedRole;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Role not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to delete role.",
      });
    }
  }
}
