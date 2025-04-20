import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, Role, User } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";

@Injectable()
export class RoleRepository {
  private logger = new Logger(RoleRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  private readonly roleSelect: Prisma.RoleSelect = {
    id: true,
    name: true,
    description: true,
    permissions: {
      select: {
        id: true,
        name: true,
        description: true,
        path: true,
        method: true,
      },
    },
  };

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
        select: this.roleSelect,
      });

      const $rolesCount = this.prismaService.role.count({
        where: combinedWhere,
      });

      const [rolesCount, roles] = await Promise.all([$rolesCount, $roles]);

      return { roles, rolesCount };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to fetch roles`, error.stack);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to fetch roles.",
          path: "roles",
        },
      ]);
    }
  }

  async findUniqueRole(id: Role["id"]) {
    try {
      const role = await this.prismaService.role.findUniqueOrThrow({
        where: { id, deletedAt: null },
        select: this.roleSelect,
      });

      return role;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to fetch role`, error.stack);
      }

      if (isRecordNotFoundPrismaError(error)) {
        throw new NotFoundException({
          message: "Role not found.",
          path: "role",
        });
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to fetch role.",
          path: "role",
        },
      ]);
    }
  }

  async createRole({ data }: { data: Prisma.RoleCreateArgs["data"] }) {
    try {
      const role = await this.prismaService.role.create({
        data,
        select: this.roleSelect,
      });

      return role;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create role`, error.stack);
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Role already exists.",
            path: "role",
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Foreign key constraint violation.",
            path: "role",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to create role.",
          path: "role",
        },
      ]);
    }
  }

  async updateRole({
    id,
    data,
  }: {
    id: Role["id"];
    data: Prisma.RoleUpdateArgs["data"];
  }) {
    try {
      const role = await this.prismaService.role.update({
        where: { id, deletedAt: null },
        data,
        select: this.roleSelect,
      });

      return role;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update role`, error.stack);
      }

      if (isRecordNotFoundPrismaError(error)) {
        throw new NotFoundException({
          message: "Role not found.",
          path: "role",
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Role already exists.",
            path: "role",
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Foreign key constraint violation.",
            path: "role",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to update role.",
          path: "role",
        },
      ]);
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
        const role = await this.prismaService.role.delete({
          where: { id },
          select: this.roleSelect,
        });

        return role;
      }

      const role = await this.prismaService.role.update({
        where: { id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
        },
        select: this.roleSelect,
      });

      return role;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to delete role`, error.stack);
      }

      if (isRecordNotFoundPrismaError(error)) {
        throw new NotFoundException({
          message: "Role not found.",
          path: "role",
        });
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to delete role.",
          path: "role",
        },
      ]);
    }
  }
}
