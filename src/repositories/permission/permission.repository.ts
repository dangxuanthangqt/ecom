import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Permission, Prisma, User } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isRecordToUpdateOrDeleteNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";

@Injectable()
export class PermissionRepository {
  private logger = new Logger(PermissionRepository.name);

  private readonly permissionSelect: Prisma.PermissionSelect = {
    id: true,
    name: true,
    description: true,
    path: true,
    method: true,
    roles: {
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    },
  };

  constructor(private readonly prismaService: PrismaService) {}

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
            select: this.permissionSelect,
          }),
        ]);

      return {
        permissions,
        permissionsCount,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to fetch permissions`, error.stack);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to fetch permissions.",
          path: "permissions",
        },
      ]);
    }
  }

  async findUniquePermission(id: Permission["id"]) {
    try {
      const permission = await this.prismaService.permission.findUniqueOrThrow({
        where: {
          id,
          deletedAt: null,
        },
        select: this.permissionSelect,
      });

      return permission;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to fetch permission`, error.stack);
      }

      if (isRecordNotFoundPrismaError(error)) {
        throw new NotFoundException({
          message: "Permission not found.",
          path: "permission",
        });
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to fetch permission.",
          path: "permission",
        },
      ]);
    }
  }

  async createPermission({
    data,
  }: {
    data: Prisma.PermissionCreateArgs["data"];
  }) {
    try {
      const permission = await this.prismaService.permission.create({
        data,
        select: this.permissionSelect,
      });

      return permission;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create permission`, error.stack);
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Permission already exists.",
            path: "permission",
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Invalid foreign key constraint.",
            path: "permission",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to create permission.",
          path: "permission",
        },
      ]);
    }
  }

  async updatePermission({
    id,
    data,
  }: {
    id: Permission["id"];
    data: Prisma.PermissionUpdateArgs["data"];
  }) {
    try {
      const permission = await this.prismaService.permission.update({
        where: {
          id,
          deletedAt: null,
        },
        data,
        select: this.permissionSelect,
      });

      return permission;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update permission`, error.stack);
      }

      if (isRecordNotFoundPrismaError(error)) {
        throw new NotFoundException([
          {
            message: "Permission not found.",
            path: "permission",
          },
        ]);
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Permission already exists.",
            path: "permission",
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Invalid foreign key constraint.",
            path: "permission",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to update permission.",
          path: "permission",
        },
      ]);
    }
  }

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
          },
          select: this.permissionSelect,
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
        },
        select: this.permissionSelect,
      });

      return permission;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to delete permission`, error.stack);
      }

      /** Delete and Update not found record */
      if (isRecordToUpdateOrDeleteNotFoundPrismaError(error)) {
        throw new NotFoundException([
          {
            message: `Permission ${id} not found or already deleted.`,
            path: "permission",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to delete permission.",
          path: "permission",
        },
      ]);
    }
  }
}
