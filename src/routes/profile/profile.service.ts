import { Injectable } from "@nestjs/common";
import { User as UserSchema } from "@prisma/client";

import { RoleRepository } from "@/repositories/role/role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class ProfileService {
  constructor(
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async getProfile(userId: UserSchema["id"]) {
    const result = await this.sharedUserRepository.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        avatar: true,
        name: true,
        email: true,
        phoneNumber: true,

        role: {
          select: this.roleRepository.roleSelect,
        },
      },
    });

    if (!result) {
      throwHttpException({
        type: "notFound",
        message: "User not found.",
      });
    }

    return result;
  }
}
