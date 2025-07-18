import { Injectable } from "@nestjs/common";
import { User as UserSchema } from "@prisma/client";

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
import { roleWithPermissionsSelect } from "src/selectors/role.selector";

@Injectable()
export class ProfileService {
  constructor(
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
  ) {}

  /**
   * Retrieves the profile of a user by their ID.
   *
   * @param userId - The ID of the user whose profile is to be retrieved.
   * @returns The user's profile data including role and permissions.
   * @throws HttpException if the user is not found or has been deleted.
   */
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

  /**
   * Updates the profile of a user.
   *
   * @param userId - The ID of the user whose profile is to be updated.
   * @param data - The data to update the user's profile with.
   * @returns The updated profile data including role and permissions.
   * @throws HttpException if the user is not found or has been deleted.
   */
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
      data: {
        ...data,
        updatedById: userId, // Set updatedById to the current user
      },
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

  /**
   * Changes the password of a user.
   *
   * @param userId - The ID of the user whose password is to be changed.
   * @param data - The data containing current and new passwords.
   * @returns A message indicating successful password change and logout from all devices.
   * @throws HttpException if the current password is incorrect or if the user is not found.
   */
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
