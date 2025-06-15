import { Injectable } from "@nestjs/common";
import { Role as RoleType } from "@prisma/client";

import { Role } from "@/constants/role.constant";
import { PrismaService } from "@/shared/services/prisma.service";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

type RoleId = RoleType["id"];

@Injectable()
export class SharedRoleRepository {
  private clientRoleId: RoleId | null = null;
  private adminRoleId: RoleId | null = null;

  constructor(private prismaService: PrismaService) {}

  /**
   * Retrieves the ID of the client role.
   * If the ID is already cached, it returns the cached value.
   * Otherwise, it queries the database for the client role and caches the ID.
   *
   * @returns The ID of the client role.
   * @throws HttpException if the client role is not found.
   */
  async getClientRoleId(): Promise<RoleId> {
    if (this.clientRoleId) {
      return this.clientRoleId;
    }

    try {
      const clientRole = await this.prismaService.role.findFirstOrThrow({
        where: {
          name: Role.CLIENT,
          deletedAt: null,
        },
      });

      this.clientRoleId = clientRole.id;

      return this.clientRoleId;
    } catch {
      throwHttpException({
        type: "notFound",
        message: `Role ${Role.CLIENT} not found.`,
      });
    }
  }

  /**
   * Retrieves the ID of the admin role.
   * If the ID is already cached, it returns the cached value.
   * Otherwise, it queries the database for the admin role and caches the ID.
   *
   * @returns The ID of the admin role.
   * @throws HttpException if the admin role is not found.
   */
  async getAdminRoleId(): Promise<RoleId> {
    if (this.adminRoleId) {
      return this.adminRoleId;
    }

    try {
      const adminRole = await this.prismaService.role.findFirstOrThrow({
        where: {
          name: Role.ADMIN,
          deletedAt: null,
        },
      });

      this.adminRoleId = adminRole.id;

      return this.adminRoleId;
    } catch {
      throwHttpException({
        type: "notFound",
        message: `Role ${Role.ADMIN} not found.`,
      });
    }
  }
}
