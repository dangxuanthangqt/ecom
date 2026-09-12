import { UnprocessableEntityException } from "@nestjs/common";

import {
  CreateUserResponseDto,
  UpdateUserResponseDto,
  BaseUserResponseDto,
  CreateUserRequestDto,
  UpdateUserRequestDto,
} from "@/dtos/user/user.dto";

import { UserController } from "../user.controller";

import {
  ACTIVE_USER_ID,
  ADMIN_ROLE_ID,
  UserControllerMocks,
  makeUserItem,
  setupUserController,
  TARGET_USER_ID,
} from "./user-controller-test-harness";

describe("UserController - createUser", () => {
  let controller: UserController;
  let mocks: UserControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupUserController());
  });

  it("calls userService.createUser with body, activeRoleId, and activeUserId", async () => {
    // Arrange
    const body = {
      name: "New User",
      email: "newuser@example.com",
      password: "Password123",
      phoneNumber: "0987654321",
      status: "ACTIVE",
    } as CreateUserRequestDto;
    mocks.userService.createUser.mockResolvedValue(makeUserItem());

    // Act
    await controller.createUser(body, ADMIN_ROLE_ID, ACTIVE_USER_ID);

    // Assert
    expect(mocks.userService.createUser).toHaveBeenCalledWith({
      body,
      activeRoleId: ADMIN_ROLE_ID,
      activeUserId: ACTIVE_USER_ID,
    });
  });

  it("returns the created user wrapped in CreateUserResponseDto", async () => {
    // Arrange
    const created = makeUserItem({ id: "new-user-id", name: "Created User" });
    mocks.userService.createUser.mockResolvedValue(created);

    // Act
    const result = await controller.createUser(
      {
        name: "Created User",
        email: "created@example.com",
        password: "Password123",
        phoneNumber: "0987654321",
        status: "ACTIVE",
      } as CreateUserRequestDto,
      ADMIN_ROLE_ID,
      ACTIVE_USER_ID,
    );

    // Assert
    expect(result).toBeInstanceOf(CreateUserResponseDto);
  });

  it("propagates rejection from userService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Email already exists");
    mocks.userService.createUser.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.createUser(
        {
          name: "New User",
          email: "existing@example.com",
          password: "Password123",
          phoneNumber: "0987654321",
          status: "ACTIVE",
        } as CreateUserRequestDto,
        ADMIN_ROLE_ID,
        ACTIVE_USER_ID,
      ),
    ).rejects.toBe(error);
  });
});

describe("UserController - updateUser", () => {
  let controller: UserController;
  let mocks: UserControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupUserController());
  });

  it("calls userService.updateUser with body, updatedUserId, activeUserId, and activeRoleId", async () => {
    // Arrange
    const body = { name: "Updated Name" };
    mocks.userService.updateUser.mockResolvedValue(makeUserItem());

    // Act
    await controller.updateUser(
      body,
      TARGET_USER_ID,
      ACTIVE_USER_ID,
      ADMIN_ROLE_ID,
    );

    // Assert
    expect(mocks.userService.updateUser).toHaveBeenCalledWith({
      body,
      activeUserId: ACTIVE_USER_ID,
      activeRoleId: ADMIN_ROLE_ID,
      updatedUserId: TARGET_USER_ID,
    });
  });

  it("returns the updated user (passes through service response)", async () => {
    // Arrange
    const updated = makeUserItem({ name: "Updated Name" });
    mocks.userService.updateUser.mockResolvedValue(updated);

    // Act
    const result = await controller.updateUser(
      { name: "Updated Name" } as UpdateUserRequestDto,
      TARGET_USER_ID,
      ACTIVE_USER_ID,
      ADMIN_ROLE_ID,
    );

    // Assert
    // Note: Controller returns the service result directly without wrapping
    expect(result).toEqual(updated);
    expect(result.name).toBe("Updated Name");
  });

  it("propagates rejection from userService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("User not found");
    mocks.userService.updateUser.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.updateUser(
        { name: "Updated Name" },
        TARGET_USER_ID,
        ACTIVE_USER_ID,
        ADMIN_ROLE_ID,
      ),
    ).rejects.toBe(error);
  });
});

describe("UserController - deleteUser", () => {
  let controller: UserController;
  let mocks: UserControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupUserController());
  });

  it("calls userService.deleteUser with deletedUserId, activeUserId, and activeRoleId", async () => {
    // Arrange
    mocks.userService.deleteUser.mockResolvedValue(makeUserItem());

    // Act
    await controller.deleteUser(TARGET_USER_ID, ACTIVE_USER_ID, ADMIN_ROLE_ID);

    // Assert
    expect(mocks.userService.deleteUser).toHaveBeenCalledWith({
      activeRoleId: ADMIN_ROLE_ID,
      activeUserId: ACTIVE_USER_ID,
      deletedUserId: TARGET_USER_ID,
    });
  });

  it("returns the deleted user wrapped in BaseUserResponseDto", async () => {
    // Arrange
    const deleted = makeUserItem();
    mocks.userService.deleteUser.mockResolvedValue(deleted);

    // Act
    const result = await controller.deleteUser(
      TARGET_USER_ID,
      ACTIVE_USER_ID,
      ADMIN_ROLE_ID,
    );

    // Assert
    expect(result).toBeInstanceOf(BaseUserResponseDto);
  });

  it("propagates rejection from userService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Cannot delete user");
    mocks.userService.deleteUser.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.deleteUser(TARGET_USER_ID, ACTIVE_USER_ID, ADMIN_ROLE_ID),
    ).rejects.toBe(error);
  });
});
