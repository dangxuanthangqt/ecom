import { Injectable } from "@nestjs/common";
import { Role as RoleType } from "@prisma/client";

import { Role } from "@/constants/role.constant";
import { PrismaService } from "@/shared/services/prisma.service";

type RoleId = RoleType["id"];

@Injectable()
export class RoleService {
  private readonly clientRoleId: RoleId;

  constructor(private prismaService: PrismaService) {}

  async getClientRoleId(): Promise<RoleId> {
    if (this.clientRoleId) {
      return Promise.resolve(this.clientRoleId);
    }

    const clientRole = await this.prismaService.role.findUniqueOrThrow({
      where: {
        name: Role.CLIENT,
      },
    });

    return clientRole.id;
  }
}
