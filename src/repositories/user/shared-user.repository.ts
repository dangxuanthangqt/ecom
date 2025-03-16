import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";

import { UserResponseData } from "./user.repository.type";

import { PrismaService } from "@/shared/services/prisma.service";

@Injectable()
export class SharedUserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findUnique(
    where: { email: User["email"] } | { id: User["id"] },
  ): Promise<UserResponseData | null> {
    const user = await this.prismaService.user.findUnique({
      where: where,
      omit: {
        password: true,
        totpSecret: true,
      },
    });

    return user;
  }
}
