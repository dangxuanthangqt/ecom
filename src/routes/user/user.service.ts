import { Injectable } from "@nestjs/common";
import { Prisma, Role, User } from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import {
  CreateUserRequestDto,
  UpdateUserRequestDto,
} from "@/dtos/user/user.dto";
import { SharedRoleRepository } from "@/repositories/role/shared-role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import {
  userSelect,
  userWithRoleAndPermissionsSelect,
  userWithRoleSelect,
} from "@/selectors/user.selector";
import { HashingService } from "@/shared/services/hashing.service";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class UserService {
  constructor(
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly sharedRoleRepository: SharedRoleRepository,
    private readonly hashingService: HashingService,
  ) {}

  /**
   * Retrieves a specific user by their ID.
   *
   * @param id - The ID of the user to retrieve.
   * @returns The user details including role and permissions.
   */
  async getUserById(id: User["id"]) {
    const user = await this.sharedUserRepository.findUniqueOrThrow({
      where: {
        id,
        deletedAt: null,
      },
      select: userWithRoleAndPermissionsSelect,
    });

    return user;
  }

  /**
   * Retrieves a paginated list of users with optional filtering and sorting.
   *
   * @param pageIndex - The current page index (default is 1).
   * @param pageSize - The number of items per page (default is 10).
   * @param order - The order direction (ASC or DESC, default is ASC).
   * @param orderBy - The field to order by (default is createdAt).
   * @returns An object containing the paginated list of users and pagination metadata.
   */
  async getUsers({
    pageIndex = 1,
    pageSize = 10,
    order = ORDER.ASC,
    orderBy = ORDER_BY.CREATED_AT,
  }: PaginationQueryDto) {
    const skip = (pageIndex - 1) * pageSize;
    const take = pageSize;

    // Normalize order for Prisma
    const normalizedOrder = order.toLowerCase();

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    const $users = this.sharedUserRepository.findMany({
      where,
      skip,
      take,
      orderBy: {
        [orderBy]: normalizedOrder,
      },
      select: userWithRoleSelect,
    });

    const $usersCount = this.sharedUserRepository.count({
      where,
    });

    const [usersCount, users] = await Promise.all([$usersCount, $users]);

    const totalPages = Math.ceil(usersCount / pageSize);

    return {
      data: users,
      pagination: {
        pageIndex,
        pageSize,
        totalPages,
        totalItems: usersCount,
      },
    };
  }

  /**
   * Creates a new user.
   *
   * @param body - The details of the user to create.
   * @param activeRoleId - The role ID of the user creating the new user.
   * @param activeUserId - The ID of the user creating the new user.
   * @returns The created user details including role and permissions.
   */
  async createUser({
    body: { name, email, password, phoneNumber, roleId, avatar, status },
    activeRoleId,
    activeUserId,
  }: {
    body: CreateUserRequestDto;
    activeRoleId: Role["id"];
    activeUserId: User["id"];
  }) {
    const adminRoleId = await this.sharedRoleRepository.getAdminRoleId();

    if (activeRoleId !== adminRoleId && roleId === adminRoleId) {
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
        createdById: activeUserId,
      },
      select: userWithRoleAndPermissionsSelect,
    });

    return createdUser;
  }

  /**
   * Validates that the active user is not trying to update themselves.
   *
   * @param activeUserId - The ID of the user performing the update.
   * @param targetedUserId - The ID of the user being updated.
   * @throws {HttpException} If the active user is trying to update themselves.
   */
  private validateYourself({
    activeUserId,
    targetedUserId, // params.id
  }: {
    activeUserId: User["id"];
    targetedUserId: User["id"];
  }) {
    if (activeUserId === targetedUserId) {
      throwHttpException({
        type: "forbidden",
        message: "You cannot update your own user.",
      });
    }
  }

  /**
   * Retrieves the role of the target user.
   *
   * @param userId - The ID of the user whose role is being retrieved.
   * @returns The role of the target user.
   */
  private async getRoleOfTargetUser(userId: User["id"]) {
    const targetRole = await this.sharedUserRepository.findUniqueOrThrow({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        roleId: true,
      },
    });

    return targetRole;
  }

  /**
   * Validates the role of the user being updated.
   *
   * @param activeRoleId - The role ID of the active user.
   * @param updatedUserRoleId - The role ID of the user being updated.
   * @param roleId - The new role ID to be assigned to the user.
   * @returns {Promise<boolean>} Returns true if validation passes.
   * @throws {HttpException} If the validation fails.
   */
  private async validateRole({
    activeRoleId,
    updatedUserRoleId, // params.id
    roleId, // body.roleId
  }: {
    activeRoleId: Role["id"];
    updatedUserRoleId: User["roleId"];
    roleId?: Role["id"];
  }): Promise<boolean> {
    const adminRoleId = await this.sharedRoleRepository.getAdminRoleId();

    // Check if the active user is an admin then they can update any user
    if (activeRoleId !== adminRoleId && updatedUserRoleId === adminRoleId) {
      throwHttpException({
        type: "forbidden",
        message: "You are not allowed to update this user.",
      });
    }

    // If the active user is not an admin, they can not update the role of the user to admin
    if (activeRoleId !== adminRoleId && roleId === adminRoleId) {
      throwHttpException({
        type: "forbidden",
        message: "You are not allowed to update the user to an admin.",
      });
    }

    return true;
  }

  /**
   * Updates an existing user by their ID.
   *
   * @param activeUserId - The ID of the user performing the update.
   * @param activeRoleId - The role ID of the user performing the update.
   * @param updatedUserId - The ID of the user being updated.
   * @param body - The updated details of the user.
   * @returns The updated user details including role and permissions.
   */
  async updateUser({
    activeUserId,
    activeRoleId,
    updatedUserId, // params.id
    body: { name, password, phoneNumber, roleId, avatar, status },
  }: {
    activeUserId: User["id"];
    activeRoleId: Role["id"];
    updatedUserId: User["id"]; // params.id
    body: UpdateUserRequestDto;
  }) {
    this.validateYourself({ activeUserId, targetedUserId: updatedUserId });

    const updatedUserRole = await this.getRoleOfTargetUser(updatedUserId);

    await this.validateRole({
      activeRoleId,
      updatedUserRoleId: updatedUserRole.roleId,
      roleId,
    });

    const hashedPassword = password
      ? this.hashingService.hash(password)
      : undefined;

    const updatedUser = await this.sharedUserRepository.updateUser({
      where: {
        id: updatedUserId,
        deletedAt: null,
      },
      data: {
        name,
        phoneNumber,
        roleId,
        avatar,
        status,
        password: hashedPassword,
        updatedById: activeUserId,
      },
      select: {
        ...userWithRoleSelect,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Deletes a user by their ID.
   *
   * @param activeUserId - The ID of the user performing the deletion.
   * @param activeRoleId - The role ID of the user performing the deletion.
   * @param deletedUserId - The ID of the user to be deleted.
   * @returns The deleted user details.
   */
  async deleteUser({
    activeRoleId,
    activeUserId,
    deletedUserId,
  }: {
    activeUserId: User["id"];
    activeRoleId: Role["id"];
    deletedUserId: User["id"]; // params.id
  }) {
    this.validateYourself({
      activeUserId,
      targetedUserId: deletedUserId,
    });

    const deletedUserRole = await this.getRoleOfTargetUser(deletedUserId);

    const adminRoleId = await this.sharedRoleRepository.getAdminRoleId();

    // If the active user is not an admin, they can not delete the admin user
    if (
      activeRoleId !== adminRoleId &&
      deletedUserRole.roleId === adminRoleId
    ) {
      throwHttpException({
        type: "forbidden",
        message: "You are not allowed to delete admin user.",
      });
    }

    if (activeRoleId === deletedUserRole.roleId) {
      throwHttpException({
        type: "forbidden",
        message: "You cannot delete the user with the same role as you.",
      });
    }

    const deletedUser = await this.sharedUserRepository.updateUser({
      where: {
        id: deletedUserId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedById: activeUserId,
        updatedById: activeUserId,
      },
      select: userSelect,
    });

    return deletedUser;
  }
}
