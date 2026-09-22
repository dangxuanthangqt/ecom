import { Injectable } from "@nestjs/common";
import { Role as RoleSchema, User as UserSchema } from "@prisma/client";

import { ErrorCode } from "@/constants/error-codes";
import { ORDER, ORDER_BY } from "@/constants/order";
import {
  CreateRoleRequestDto,
  DeleteRoleRequestDto,
  UpdateRoleRequestDto,
} from "@/dtos/role/role.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { RoleRepository } from "@/repositories/role/role.repository";
import { RolePermissionCacheService } from "@/shared/services/role-permission-cache.service";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly rolePermissionCacheService: RolePermissionCacheService,
  ) {}

  /**
   * Retrieves a paginated list of roles with optional filtering and sorting.
   *
   * @param pageIndex - The current page index (default is 1).
   * @param pageSize - The number of items per page (default is 10).
   * @param order - The order direction (ASC or DESC, default is ASC).
   * @param orderBy - The field to order by (default is createdAt).
   * @returns An object containing the paginated list of roles and pagination metadata.
   */
  async getRoles({
    pageIndex = 1,
    pageSize = 10,
    order = ORDER.ASC,
    orderBy = ORDER_BY.CREATED_AT,
  }: PaginationQueryDto) {
    const skip = (pageIndex - 1) * pageSize;
    const take = pageSize;
    // Normalize order for Prisma
    const normalizedOrder = order.toLowerCase();

    const { roles, rolesCount } = await this.roleRepository.findManyRoles({
      take,
      skip,
      orderBy: { [orderBy]: normalizedOrder },
    });

    const totalPages = Math.ceil(rolesCount / pageSize);
    return {
      data: roles,
      pagination: {
        pageIndex,
        pageSize,
        totalPages,
        totalItems: rolesCount,
      },
    };
  }

  /**
   * Retrieves a specific role by its ID.
   *
   * @param id - The ID of the role to retrieve.
   * @returns The role data if found.
   * @throws HttpException if the role is not found.
   */
  async getRoleById(id: RoleSchema["id"]) {
    const role = await this.roleRepository.findUniqueRole(id);

    return role;
  }

  /**
   * Creates a new role with the specified permissions.
   *
   * @param body - The request body containing role details and permission IDs.
   * @param userId - The ID of the user creating the role.
   * @returns The created role.
   */
  async createRole({
    body: { name, description, permissionIds },
    userId,
  }: {
    body: CreateRoleRequestDto;
    userId: UserSchema["id"];
  }) {
    const role = await this.roleRepository.createRole({
      data: {
        name,
        description,
        createdById: userId,
      },
      permissionIds,
    });

    return role;
  }

  /**
   * System roles (`admin`, `client`, `seller`) take their grants from
   * `RolePermissionMatrix` in code and are re-applied on every seed, so an edit
   * through the API would be silently undone — refusing is the honest answer.
   * The flag is data (`Role.isSystem`), not a hardcoded list of names.
   *
   * @param id - The ID of the role to verify.
   * @throws HttpException if the role is a system role or not found.
   */
  async verifyForbiddenRole(id: RoleSchema["id"]) {
    const role = await this.roleRepository.findUniqueRole(id);

    if (!role) {
      throwHttpException({
        type: "notFound",
        code: ErrorCode.ROLE_NOT_FOUND,
        message: "Role not found",
      });
    }

    if (role.isSystem) {
      throwHttpException({
        type: "forbidden",
        code: ErrorCode.ROLE_SYSTEM_IMMUTABLE,
        message: "System roles cannot be modified through the API.",
      });
    }
  }

  /**
   * Updates an existing role by its ID.
   *
   * @param body - The request body containing updated role details and permission IDs.
   * @param userId - The ID of the user updating the role.
   * @param id - The ID of the role to update.
   * @returns The updated role.
   */
  async updateRole({
    body: { name, description, permissionIds },
    userId,
    id,
  }: {
    body: UpdateRoleRequestDto;
    userId: UserSchema["id"];
    id: RoleSchema["id"];
  }) {
    await this.verifyForbiddenRole(id);

    const role = await this.roleRepository.updateRole({
      id,
      data: {
        name,
        description,
        updatedById: userId,
      },
      permissionIds,
    });

    await this.rolePermissionCacheService.invalidateRole(id);

    return role;
  }

  /**
   * Deletes a role by its ID.
   *
   * @param id - The ID of the role to delete.
   * @param userId - The ID of the user performing the deletion.
   * @param body - The request body containing deletion options.
   * @returns The deleted role.
   */
  async deleteRole({
    id,
    userId,
    body: { isHardDelete },
  }: {
    id: RoleSchema["id"];
    userId: UserSchema["id"];
    body: DeleteRoleRequestDto;
  }) {
    await this.verifyForbiddenRole(id);

    const role = await this.roleRepository.deleteRole({
      id,
      userId,
      isHardDelete,
    });

    await this.rolePermissionCacheService.invalidateRole(id);

    return role;
  }
}
