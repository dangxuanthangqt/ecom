import { Injectable, Logger } from "@nestjs/common";
import { Permission, Prisma, Role, User } from "@prisma/client";
import { roleWithPermissionsSelect } from "src/selectors/role.selector";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class RoleRepository {
  private logger = new Logger(RoleRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  async findManyRoles({
    where,
    take,
    skip,
    orderBy,
  }: {
    where?: Prisma.RoleWhereInput;
    take?: number;
    skip?: number;
    orderBy?: Prisma.RoleOrderByWithRelationInput;
  }) {
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

  async createRole({
    data,
    permissions,
  }: {
    data: Prisma.RoleCreateArgs["data"];
    permissions?: Permission["id"][];
  }) {
    if (permissions && permissions.length > 0) {
      await this.validatePermissions(permissions);
    }

    try {
      const role = await this.prismaService.role.create({
        data: {
          ...data,
          permissions: {
            connect: permissions?.map((permissionId) => ({
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

  async updateRole({
    id,
    data,
    permissions,
  }: {
    id: Role["id"];
    data: Prisma.RoleUpdateArgs["data"];
    permissions?: Permission["id"][];
  }) {
    if (permissions && permissions.length > 0) {
      await this.validatePermissions(permissions);
    }

    try {
      const role = await this.prismaService.role.update({
        where: { id, deletedAt: null },
        data: {
          ...data,
          permissions: {
            set: permissions?.map((permissionId) => ({
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
