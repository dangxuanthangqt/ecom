import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { ORDER, ORDER_BY } from "@/constants/order";
import {
  userWithRoleAndPermissionsSelect,
  userWithRoleSelect,
} from "@/selectors/user.selector";

import { UserService } from "../user.service";

import {
  containing,
  makeUser,
  setupUserService,
  TARGET_USER_ID,
  UserServiceMocks,
} from "./user-service-test-harness";

describe("UserService - read", () => {
  let service: UserService;
  let mocks: UserServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupUserService());
  });

  describe("getUserById", () => {
    it("returns the user together with their role and permissions", async () => {
      // Arrange
      const user = makeUser();
      mocks.sharedUserRepository.findUniqueOrThrow.mockResolvedValue(user);

      // Act
      const result = await service.getUserById(TARGET_USER_ID);

      // Assert
      expect(result).toBe(user);
      expect(mocks.sharedUserRepository.findUniqueOrThrow).toHaveBeenCalledWith(
        {
          where: { id: TARGET_USER_ID, deletedAt: null },
          select: userWithRoleAndPermissionsSelect,
        },
      );
    });

    it("propagates the repository error when no live user matches", async () => {
      // Arrange
      const notFound = new NotFoundException({ message: "User not found." });
      mocks.sharedUserRepository.findUniqueOrThrow.mockRejectedValue(notFound);

      // Act
      const promise = service.getUserById(TARGET_USER_ID);

      // Assert
      await expect(promise).rejects.toBe(notFound);
    });
  });

  describe("getUsers", () => {
    const arrangePage = (rows: unknown[], total: number) => {
      mocks.sharedUserRepository.findMany.mockResolvedValue(rows);
      mocks.sharedUserRepository.count.mockResolvedValue(total);
    };

    it("falls back to page 1, size 10, ascending by createdAt when nothing is supplied", async () => {
      // Arrange
      const rows = [makeUser()];
      arrangePage(rows, 3);

      // Act
      const result = await service.getUsers({});

      // Assert
      expect(result).toEqual({
        data: rows,
        pagination: {
          pageIndex: 1,
          pageSize: 10,
          totalPages: 1,
          totalItems: 3,
        },
      });
      expect(mocks.sharedUserRepository.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 0,
        take: 10,
        orderBy: { [ORDER_BY.CREATED_AT]: ORDER.ASC },
        select: userWithRoleSelect,
      });
    });

    it("honours an explicit page, size, direction and sort field", async () => {
      // Arrange
      arrangePage([], 0);

      // Act
      await service.getUsers({
        pageIndex: 3,
        pageSize: 25,
        order: ORDER.DESC,
        orderBy: ORDER_BY.UPDATED_AT,
      });

      // Assert
      expect(mocks.sharedUserRepository.findMany).toHaveBeenCalledWith(
        containing({
          skip: 50,
          take: 25,
          orderBy: { [ORDER_BY.UPDATED_AT]: ORDER.DESC },
        }),
      );
    });

    it("lower-cases the sort direction before handing it to the repository", async () => {
      // Arrange
      arrangePage([], 0);

      // Act
      await service.getUsers({
        order: "DESC" as unknown as typeof ORDER.DESC,
        orderBy: ORDER_BY.CREATED_AT,
      });

      // Assert
      expect(mocks.sharedUserRepository.findMany).toHaveBeenCalledWith(
        containing({
          orderBy: { [ORDER_BY.CREATED_AT]: "desc" },
        }),
      );
    });

    it("rounds a partial last page up and counts only live users", async () => {
      // Arrange
      arrangePage([makeUser()], 21);

      // Act
      const result = await service.getUsers({ pageSize: 10 });

      // Assert
      expect(result.pagination).toEqual({
        pageIndex: 1,
        pageSize: 10,
        totalPages: 3,
        totalItems: 21,
      });
      expect(mocks.sharedUserRepository.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it("propagates a repository failure while listing", async () => {
      // Arrange
      const failure = new InternalServerErrorException({
        message: "Failed to find users.",
      });
      mocks.sharedUserRepository.findMany.mockRejectedValue(failure);
      mocks.sharedUserRepository.count.mockResolvedValue(0);

      // Act
      const promise = service.getUsers({});

      // Assert
      await expect(promise).rejects.toBe(failure);
    });

    it("propagates a repository failure while counting", async () => {
      // Arrange
      const failure = new InternalServerErrorException({
        message: "Failed to count users.",
      });
      mocks.sharedUserRepository.findMany.mockResolvedValue([]);
      mocks.sharedUserRepository.count.mockRejectedValue(failure);

      // Act
      const promise = service.getUsers({});

      // Assert
      await expect(promise).rejects.toBe(failure);
    });

    it("reports zero pages when no user matches", async () => {
      // Arrange
      arrangePage([], 0);

      // Act
      const result = await service.getUsers({});

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.totalPages).toBe(0);
    });
  });
});
