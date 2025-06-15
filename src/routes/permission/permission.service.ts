import { Injectable } from "@nestjs/common";
import { Permission, User } from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import {
  CreatePermissionRequestDto,
  DeletePermissionRequestDto,
  UpdatePermissionRequestDto,
} from "@/dtos/permission/permission.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { PermissionRepository } from "@/repositories/permission/permission.repository";

@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  /**
   * Retrieves a paginated list of permissions with optional filtering and sorting.
   *
   * @param pageIndex - The current page index (default is 1).
   * @param pageSize - The number of items per page (default is 10).
   * @param order - The order direction (ASC or DESC, default is ASC).
   * @param orderBy - The field to order by (default is createdAt).
   * @returns An object containing the paginated list of permissions and pagination metadata.
   */
  async getPermissions({
    pageIndex = 1,
    pageSize = 10,
    order = ORDER.ASC,
    orderBy = ORDER_BY.CREATED_AT,
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

  /**
   * Retrieves a specific permission by its ID.
   *
   * @param id - The ID of the permission to retrieve.
   * @returns The permission details.
   */
  async getPermissionById(id: Permission["id"]) {
    const permission = await this.permissionRepository.findUniquePermission(id);

    return permission;
  }

  /**
   * Creates a new permission.
   *
   * @param body - The details of the permission to create.
   * @param userId - The ID of the user creating the permission.
   * @returns The created permission details.
   */
  async createPermission({
    body: { name, description, path, method, rolesIds },
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
        module: path.split("/")[1].toUpperCase(),
        createdById: userId,
      },
      rolesIds,
    });

    return permission;
  }

  /**
   * Updates an existing permission by its ID.
   *
   * @param id - The ID of the permission to update.
   * @param body - The updated details of the permission.
   * @param userId - The ID of the user updating the permission.
   * @returns The updated permission details.
   */
  async updatePermission({
    id,
    body: { name, description, path, method, rolesIds },
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
          set: rolesIds?.map((roleId) => ({ id: roleId })),
        },
        updatedById: userId,
      },
    });

    return permission;
  }

  /**
   * Deletes a permission by its ID.
   *
   * @param id - The ID of the permission to delete.
   * @param userId - The ID of the user performing the deletion.
   * @param body - The request body containing deletion options.
   * @returns The deleted permission details.
   */
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
