import { Injectable } from "@nestjs/common";
import { Role as RoleSchema, User as UserSchema } from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import { Role } from "@/constants/role.constant";
import {
  CreateRoleRequestDto,
  DeleteRoleRequestDto,
  UpdateRoleRequestDto,
} from "@/dtos/role/role.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { RoleRepository } from "@/repositories/role/role.repository";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class RoleService {
  private forbiddenRoles: string[] = [Role.ADMIN, Role.CLIENT, Role.SELLER];

  constructor(private readonly roleRepository: RoleRepository) {}

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

  async getRoleById(id: RoleSchema["id"]) {
    const role = await this.roleRepository.findUniqueRole(id);

    return role;
  }

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

  async verifyForbiddenRole(id: RoleSchema["id"]) {
    const role = await this.roleRepository.findUniqueRole(id);

    if (!role) {
      throwHttpException({
        type: "notFound",
        message: "Role not found",
      });
    }

    if (this.forbiddenRoles.includes(role.name)) {
      throwHttpException({
        type: "forbidden",
        message: "You cannot modify this role.",
      });
    }
  }

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

    return role;
  }

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

    return role;
  }
}
