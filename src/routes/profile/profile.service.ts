import { Injectable } from "@nestjs/common";
import { User as UserSchema } from "@prisma/client";
import { roleWithPermissionsSelect } from "src/selectors/role.selector";

import {
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
  UpdateProfileRequestDto,
  UpdateProfileResponseDto,
} from "@/dtos/profile/profile.dto";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { userWithRoleAndPermissionsSelect } from "@/selectors/user.selector";
import { HashingService } from "@/shared/services/hashing.service";
import { PrismaService } from "@/shared/services/prisma.service";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class ProfileService {
  constructor(
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
  ) {}

  async getProfile(userId: UserSchema["id"]) {
    const result = await this.sharedUserRepository.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: userWithRoleAndPermissionsSelect,
    });

    if (!result) {
      throwHttpException({
        type: "notFound",
        message: "User not found.",
      });
    }

    return result;
  }

  async updateProfile({
    userId,
    data,
  }: {
    userId: UserSchema["id"];
    data: UpdateProfileRequestDto;
  }): Promise<UpdateProfileResponseDto> {
    const result = await this.sharedUserRepository.updateUser({
      where: {
        id: userId,
        deletedAt: null,
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        avatar: true,
        status: true,
        role: {
          select: roleWithPermissionsSelect, // Use consistent role selection
        },
        updatedAt: true,
      },
    });

    return result;
  }

  async changePassword({
    userId,
    data,
  }: {
    userId: UserSchema["id"];
    data: ChangePasswordRequestDto;
  }): Promise<ChangePasswordResponseDto> {
    const { currentPassword, newPassword } = data;

    const user = await this.sharedUserRepository.findUniqueOrThrow({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        password: true,
      },
    });

    const isCurrentPasswordValid = this.hashingService.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throwHttpException({
        type: "unprocessable",
        message: "Current password is incorrect.",
      });
    }

    const hashedNewPassword = this.hashingService.hash(newPassword);

    await this.prismaService.$transaction(async (prisma) => {
      // 1. Update user password
      await prisma.user.update({
        where: {
          id: userId,
          deletedAt: null,
        },
        data: {
          password: hashedNewPassword,
          updatedById: userId,
        },
      });

      // 2. Delete all refresh tokens for this user
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // 3. Mark all devices as inactive
      // Need update logic check isActive in access token guard
      // to prevent user from being logged out if the device is not active
      await prisma.device.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    return {
      message:
        "Password changed successfully. You've been logged out from all devices.",
    };
  }
}
