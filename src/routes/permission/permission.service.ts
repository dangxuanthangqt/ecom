import { Injectable } from "@nestjs/common";
import { Permission, User } from "@prisma/client";

import {
  CreatePermissionRequestDto,
  DeletePermissionRequestDto,
  UpdatePermissionRequestDto,
} from "@/dto/permission/permission.dto";
import { PaginationQueryDto } from "@/dto/shared/pagination.dto";
import { PermissionRepository } from "@/repositories/permission/permission.repository";

@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async getPermissions({
    pageIndex = 1,
    pageSize = 10,
    order = "ASC",
    orderBy = "createdAt",
  }: PaginationQueryDto) {
    const skip = (pageIndex - 1) * pageSize;
    const take = pageSize;

    // Normalize order for Prisma
    const normalizedOrder = order.toLowerCase();

    const { permissions, permissionsCount } =
      await this.permissionRepository.findManyPermissions({
        take,
        skip,
        orderBy: { [orderBy]: normalizedOrder },
      });

    const totalPages = Math.ceil(permissionsCount / pageSize);

    return {
      data: permissions,
      pagination: {
        pageIndex,
        pageSize,
        totalPages,
        totalItems: permissionsCount,
      },
    };
  }

  async getPermissionById(id: Permission["id"]) {
    const permission = await this.permissionRepository.findUniquePermission(id);

    return permission;
  }

  async createPermission({
    body: { name, description, path, method, roles },
    userId,
  }: {
    body: CreatePermissionRequestDto;
    userId: User["id"];
  }) {
    const permission = await this.permissionRepository.createPermission({
      data: {
        name,
        description,
        path,
        method,
        roles: {
          connect: roles?.map((roleId) => ({ id: roleId })),
        },
        createdById: userId,
      },
    });

    return permission;
  }

  async updatePermission({
    id,
    body: { name, description, path, method, roles },
    userId,
  }: {
    userId: User["id"];
    id: Permission["id"];
    body: UpdatePermissionRequestDto;
  }) {
    const permission = await this.permissionRepository.updatePermission({
      id,
      data: {
        name,
        description,
        path,
        method,
        roles: {
          set: roles?.map((roleId) => ({ id: roleId })),
        },
        updatedById: userId,
      },
    });

    return permission;
  }

  async deletePermission({
    id,
    userId,
    body: { isHardDelete },
  }: {
    id: Permission["id"];
    userId: User["id"];
    body: DeletePermissionRequestDto;
  }) {
    const permission = await this.permissionRepository.deletePermission({
      id,
      userId,
      isHardDelete,
    });

    return permission;
  }
}
