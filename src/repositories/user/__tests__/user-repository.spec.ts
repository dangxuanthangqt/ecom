import { UnprocessableEntityException } from "@nestjs/common";

import { UserRepository } from "../user.repository";

import {
  setupUserRepository,
  USER_ID,
  ROLE_ID,
  makeUser,
  containing,
  UserRepositoryMocks,
  createPrismaUniqueError,
  createPrismaForeignKeyError,
  createPrismaNotFoundError,
} from "./user-repository-test-harness";

describe("UserRepository - registerUser", () => {
  let repository: UserRepository;
  let mocks: UserRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupUserRepository());
  });

  it("creates a user and returns user without password or totp", async () => {
    // Arrange
    const userData = {
      email: "john@example.com",
      name: "John Doe",
      phoneNumber: "0987654321",
      password: "hashed-password",
      roleId: ROLE_ID,
    };
    const createdUser = makeUser(userData);
    mocks.prismaService.user.create.mockResolvedValue(createdUser);

    // Act
    const result = await repository.registerUser(userData);

    // Assert
    expect(mocks.prismaService.user.create).toHaveBeenCalledWith({
      data: userData,
      omit: {
        password: true,
        totpSecret: true,
      },
    });
    expect(result).toEqual(createdUser);
  });

  it("throws UnprocessableEntityException on duplicate email", async () => {
    // Arrange
    const userData = {
      email: "john@example.com",
      name: "John Doe",
      phoneNumber: "0987654321",
      password: "hashed-password",
      roleId: ROLE_ID,
    };
    mocks.prismaService.user.create.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.registerUser(userData);

    // Assert
    await expect(promise).rejects.toThrow(UnprocessableEntityException);
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Email is already exist.",
      }),
    });
  });

  it("throws UnprocessableEntityException on foreign key constraint", async () => {
    // Arrange
    const userData = {
      email: "john@example.com",
      name: "John Doe",
      phoneNumber: "0987654321",
      password: "hashed-password",
      roleId: "invalid-role-id",
    };
    mocks.prismaService.user.create.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.registerUser(userData);

    // Assert
    await expect(promise).rejects.toThrow(UnprocessableEntityException);
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Invalid foreign key constraint.",
      }),
    });
  });

  it("throws InternalServerErrorException on other errors", async () => {
    // Arrange
    const userData = {
      email: "john@example.com",
      name: "John Doe",
      phoneNumber: "0987654321",
      password: "hashed-password",
      roleId: ROLE_ID,
    };
    mocks.prismaService.user.create.mockRejectedValue(
      new Error("Unexpected error"),
    );

    // Act
    const promise = repository.registerUser(userData);

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("UserRepository - updateUser", () => {
  let repository: UserRepository;
  let mocks: UserRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupUserRepository());
  });

  it("updates a user by id and returns updated user without sensitive fields", async () => {
    // Arrange
    const updatedUser = makeUser({
      name: "Jane Doe",
      email: "jane@example.com",
    });
    mocks.prismaService.user.update.mockResolvedValue(updatedUser);

    // Act
    const result = await repository.updateUser({
      where: { id: USER_ID },
      data: { name: "Jane Doe", email: "jane@example.com" },
    });

    // Assert
    expect(mocks.prismaService.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { name: "Jane Doe", email: "jane@example.com" },
      omit: {
        password: true,
        totpSecret: true,
      },
    });
    expect(result).toEqual(updatedUser);
  });

  it("throws NotFoundException when user not found", async () => {
    // Arrange
    const nonExistentId = "99999999-9999-9999-9999-999999999999";
    mocks.prismaService.user.update.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.updateUser({
      where: { id: nonExistentId },
      data: { name: "Updated" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "User not found.",
      }),
    });
  });

  it("throws UnprocessableEntityException on duplicate email", async () => {
    // Arrange
    mocks.prismaService.user.update.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.updateUser({
      where: { id: USER_ID },
      data: { email: "duplicate@example.com" },
    });

    // Assert
    await expect(promise).rejects.toThrow(UnprocessableEntityException);
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Email is already in use.",
      }),
    });
  });

  it("throws UnprocessableEntityException on foreign key constraint", async () => {
    // Arrange
    mocks.prismaService.user.update.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.updateUser({
      where: { id: USER_ID },
      data: { roleId: "invalid-role-id" },
    });

    // Assert
    await expect(promise).rejects.toThrow(UnprocessableEntityException);
  });
});
