import { Injectable } from "@nestjs/common";
import { Role, User } from "@prisma/client";

import {
  CreateRoleRequestDto,
  DeleteRoleRequestDto,
  UpdateRoleRequestDto,
} from "@/dto/role/role.dto";
import { PaginationRequestParamsDto } from "@/dto/shared/pagination.dto";
import { RoleRepository } from "@/repositories/role/role.repository";

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async getRoles({
    pageIndex = 1,
    pageSize = 10,
    order = "ASC",
    orderBy = "createdAt",
  }: PaginationRequestParamsDto) {
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

  async getRoleById(id: Role["id"]) {
    const role = await this.roleRepository.findUniqueRole(id);

    return role;
  }

  async createRole({
    body: { name, description, permissions },
    userId,
  }: {
    body: CreateRoleRequestDto;
    userId: User["id"];
  }) {
    const role = await this.roleRepository.createRole({
      data: {
        name,
        description,
        permissions: {
          connect: permissions?.map((permissionId) => ({
            id: permissionId,
          })),
        },
        createdById: userId,
      },
    });

    return role;
  }

  async updateRole({
    body: { name, description, permissions },
    userId,
    id,
  }: {
    body: UpdateRoleRequestDto;
    userId: User["id"];
    id: Role["id"];
  }) {
    const role = await this.roleRepository.updateRole({
      id,
      data: {
        name,
        description,
        permissions: {
          set: permissions?.map((permissionId) => ({
            id: permissionId,
          })),
        },
        updatedById: userId,
      },
    });

    return role;
  }

  async deleteRole({
    id,
    userId,
    body: { isHardDelete },
  }: {
    id: Role["id"];
    userId: User["id"];
    body: DeleteRoleRequestDto;
  }) {
    const role = await this.roleRepository.deleteRole({
      id,
      userId,
      isHardDelete,
    });

    return role;
  }
}
