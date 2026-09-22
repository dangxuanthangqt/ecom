import { Injectable } from "@nestjs/common";
import { Permission } from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { PermissionRepository } from "@/repositories/permission/permission.repository";

@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  /**
   * Retrieves a paginated list of permissions with optional sorting.
   *
   * @param page - The current page number (default is 1).
   * @param pageSize - The number of items per page (default is 10).
   * @param order - The order direction (ASC or DESC, default is ASC).
   * @param orderBy - The field to order by (default is createdAt).
   * @returns The paginated list of permissions and pagination metadata.
   */
  async getPermissions({
    page = 1,
    pageSize = 10,
    order = ORDER.ASC,
    orderBy = ORDER_BY.CREATED_AT,
  }: PaginationQueryDto) {
    const skip = (page - 1) * pageSize;
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
        page,
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
}
