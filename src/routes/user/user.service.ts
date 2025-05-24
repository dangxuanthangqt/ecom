import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import {
  roleSelect,
  roleWithPermissionsSelect,
} from "src/selectors/role.selector";

import {
  CreateUserRequestDto,
  UpdateUserRequestDto,
} from "@/dtos/user/user.dto";
import { RoleRepository } from "@/repositories/role/role.repository";
import { SharedRoleRepository } from "@/repositories/role/shared-role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { HashingService } from "@/shared/services/hashing.service";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class UserService {
  constructor(
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly sharedRoleRepository: SharedRoleRepository,
    private readonly hashingService: HashingService,
    private readonly roleRepository: RoleRepository,
  ) {}

  async createUser({
    body: { name, email, password, phoneNumber, roleId, avatar, status },
    activeUserId,
  }: {
    body: CreateUserRequestDto;
    activeUserId: User["id"];
  }) {
    const userExists = await this.sharedUserRepository.findUnique({
      where: {
        id: activeUserId,
        deletedAt: null,
      },
    });

    const adminRoleId = await this.sharedRoleRepository.getAdminRoleId();

    if (userExists?.roleId !== adminRoleId && roleId === adminRoleId) {
      throwHttpException({
        type: "forbidden",
        message: "You are not allowed to create an admin user.",
      });
    }

    const clientRoleId = await this.sharedRoleRepository.getClientRoleId();

    const validRoleId = roleId ?? clientRoleId;

    const hashedPassword = this.hashingService.hash(password);

    const createdUser = await this.sharedUserRepository.createUser({
      data: {
        name,
        email,
        password: hashedPassword,
        phoneNumber,
        roleId: validRoleId,
        avatar,
        status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: {
          select: roleWithPermissionsSelect,
        },
        avatar: true,
        status: true,
      },
    });

    return createdUser;
  }

  async updateUser({
    activeUserId,
    updatedUserId,
    activeUserRoleId,
    body: { name, password, phoneNumber, roleId, avatar, status },
  }: {
    activeUserId: User["id"];
    activeUserRoleId: User["roleId"];
    updatedUserId: User["id"];
    body: UpdateUserRequestDto;
  }) {
    const updatedUser = await this.sharedUserRepository.findUniqueOrThrow({
      where: {
        id: updatedUserId,
        deletedAt: null,
      },
    });

    if (updatedUser.id === activeUserId) {
      throwHttpException({
        type: "forbidden",
        message: "You cannot update your own user.",
      });
    }

    const adminRoleId = await this.sharedRoleRepository.getAdminRoleId();

    if (activeUserRoleId !== adminRoleId && roleId === adminRoleId) {
      throwHttpException({
        type: "forbidden",
        message: "You are not allowed to update the user to an admin.",
      });
    }

    const hashedPassword = password
      ? this.hashingService.hash(password)
      : undefined;

    const updatedResult = await this.sharedUserRepository.updateUser({
      where: {
        id: activeUserId,
        deletedAt: null,
      },
      data: {
        name,
        phoneNumber,
        roleId,
        avatar,
        status,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: {
          select: roleSelect,
        },
        avatar: true,
        status: true,
      },
    });

    return updatedResult;
  }
}
