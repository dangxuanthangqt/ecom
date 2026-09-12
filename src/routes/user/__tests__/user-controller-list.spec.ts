import { UnprocessableEntityException } from "@nestjs/common";

import { PageDto } from "@/dtos/shared/page.dto";
import {
  UserPaginationQueryDto,
  UserItemResponseDto,
} from "@/dtos/user/user.dto";

import { UserController } from "../user.controller";

import {
  UserControllerMocks,
  makePaginatedUsers,
  makeUserItem,
  setupUserController,
  TARGET_USER_ID,
} from "./user-controller-test-harness";

describe("UserController - getUsers", () => {
  let controller: UserController;
  let mocks: UserControllerMocks;

  const makePaginationQuery = () => ({ pageIndex: 0, pageSize: 10 });

  beforeEach(async () => {
    ({ controller, mocks } = await setupUserController());
  });

  it("calls userService.getUsers with the pagination query", async () => {
    // Arrange
    const query = makePaginationQuery();
    mocks.userService.getUsers.mockResolvedValue(makePaginatedUsers());

    // Act
    await controller.getUsers(query);

    // Assert
    expect(mocks.userService.getUsers).toHaveBeenCalledWith(query);
  });

  it("returns paginated users wrapped in PageDto", async () => {
    // Arrange
    const userItems = [
      makeUserItem({ name: "User 1" }),
      makeUserItem({ name: "User 2" }),
    ];
    const serviceResponse = {
      data: userItems,
      pagination: {
        totalPages: 1,
        totalItems: 2,
        pageSize: 10,
        pageIndex: 0,
      },
    };
    mocks.userService.getUsers.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.getUsers(makePaginationQuery());

    // Assert
    expect(result).toBeInstanceOf(PageDto);
    expect(result.data).toHaveLength(2);
  });

  it("passes optional query parameters to service", async () => {
    // Arrange
    const query: UserPaginationQueryDto = {
      pageIndex: 1,
      pageSize: 20,
      keyword: "john",
    };
    mocks.userService.getUsers.mockResolvedValue(makePaginatedUsers());

    // Act
    await controller.getUsers(query);

    // Assert
    expect(mocks.userService.getUsers).toHaveBeenCalledWith(query);
  });

  it("propagates rejection from userService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Database error");
    mocks.userService.getUsers.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getUsers(makePaginationQuery())).rejects.toBe(
      error,
    );
  });
});

describe("UserController - getUserById", () => {
  let controller: UserController;
  let mocks: UserControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupUserController());
  });

  it("calls userService.getUserById with the user ID", async () => {
    // Arrange
    mocks.userService.getUserById.mockResolvedValue(makeUserItem());

    // Act
    await controller.getUserById(TARGET_USER_ID);

    // Assert
    expect(mocks.userService.getUserById).toHaveBeenCalledWith(TARGET_USER_ID);
  });

  it("returns the user wrapped in UserItemResponseDto", async () => {
    // Arrange
    const serviceResponse = makeUserItem({ id: TARGET_USER_ID });
    mocks.userService.getUserById.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.getUserById(TARGET_USER_ID);

    // Assert
    expect(result).toBeInstanceOf(UserItemResponseDto);
    expect(result.id).toBe(TARGET_USER_ID);
  });

  it("propagates rejection from userService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("User not found");
    mocks.userService.getUserById.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getUserById(TARGET_USER_ID)).rejects.toBe(error);
  });
});
