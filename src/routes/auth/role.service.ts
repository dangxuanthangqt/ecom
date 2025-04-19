import { Injectable, NotFoundException } from "@nestjs/common";
import { Role as RoleType } from "@prisma/client";

import { Role } from "@/constants/role.constant";
import { PrismaService } from "@/shared/services/prisma.service";

type RoleId = RoleType["id"];

@Injectable()
export class RoleService {
  private clientRoleId: RoleId | null = null;

  constructor(private prismaService: PrismaService) {}

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
      throw new NotFoundException(`Role ${Role.CLIENT} not found.`);
    }
  }
}
