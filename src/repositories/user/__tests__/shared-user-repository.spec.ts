import { UnprocessableEntityException } from "@nestjs/common";

import { SharedUserRepository } from "../shared-user.repository";

import {
  setupSharedUserRepository,
  USER_ID,
  ROLE_ID,
  makeUser,
  containing,
  UserRepositoryMocks,
  createPrismaUniqueError,
  createPrismaForeignKeyError,
  createPrismaNotFoundError,
} from "./user-repository-test-harness";

describe("SharedUserRepository - findUnique", () => {
  let repository: SharedUserRepository;
  let mocks: UserRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedUserRepository());
  });

  it("finds a user by unique criteria", async () => {
    // Arrange
    const user = makeUser();
    mocks.prismaService.user.findUnique.mockResolvedValue(user);

    // Act
    const result = await repository.findUnique({
      where: { id: USER_ID },
    });

    // Assert
    expect(mocks.prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
    });
    expect(result).toEqual(user);
  });

  it("returns null when user not found", async () => {
    // Arrange
    mocks.prismaService.user.findUnique.mockResolvedValue(null);

    // Act
    const result = await repository.findUnique({
      where: { id: "nonexistent-id" },
    });

    // Assert
    expect(result).toBeNull();
  });

  it("throws NotFoundException on record not found error", async () => {
    // Arrange
    mocks.prismaService.user.findUnique.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.findUnique({
      where: { id: USER_ID },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "User not found.",
      }),
    });
  });
});

describe("SharedUserRepository - findMany", () => {
  let repository: SharedUserRepository;
  let mocks: UserRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedUserRepository());
  });

  it("finds multiple users with pagination", async () => {
    // Arrange
    const users = [
      makeUser(),
      makeUser({ id: "22222222-2222-4222-8222-222222222222" }),
    ];
    mocks.prismaService.user.findMany.mockResolvedValue(users);

    // Act
    const result = await repository.findMany({
      skip: 0,
      take: 10,
    });

    // Assert
    expect(mocks.prismaService.user.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
    });
    expect(result).toEqual(users);
  });

  it("returns empty array when no users found", async () => {
    // Arrange
    mocks.prismaService.user.findMany.mockResolvedValue([]);

    // Act
    const result = await repository.findMany({
      where: { status: "INACTIVE" },
    });

    // Assert
    expect(result).toEqual([]);
  });

  it("applies orderBy clause", async () => {
    // Arrange
    const users = [makeUser()];
    mocks.prismaService.user.findMany.mockResolvedValue(users);

    // Act
    await repository.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Assert
    expect(mocks.prismaService.user.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("SharedUserRepository - findFirstOrThrow", () => {
  let repository: SharedUserRepository;
  let mocks: UserRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedUserRepository());
  });

  it("finds first user matching criteria", async () => {
    // Arrange
    const user = makeUser();
    mocks.prismaService.user.findFirstOrThrow.mockResolvedValue(user);

    // Act
    const result = await repository.findFirstOrThrow({
      where: { email: "john@example.com" },
    });

    // Assert
    expect(mocks.prismaService.user.findFirstOrThrow).toHaveBeenCalledWith({
      where: { email: "john@example.com" },
    });
    expect(result).toEqual(user);
  });

  it("throws NotFoundException when no user found", async () => {
    // Arrange
    mocks.prismaService.user.findFirstOrThrow.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.findFirstOrThrow({
      where: { email: "nonexistent@example.com" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "User not found.",
      }),
    });
  });
});

describe("SharedUserRepository - findFirst", () => {
  let repository: SharedUserRepository;
  let mocks: UserRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedUserRepository());
  });

  it("finds first user matching criteria", async () => {
    // Arrange
    const user = makeUser();
    mocks.prismaService.user.findFirst.mockResolvedValue(user);

    // Act
    const result = await repository.findFirst({
      where: { status: "ACTIVE" },
    });

    // Assert
    expect(mocks.prismaService.user.findFirst).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
    });
    expect(result).toEqual(user);
  });

  it("returns null when no user found", async () => {
    // Arrange
    mocks.prismaService.user.findFirst.mockResolvedValue(null);

    // Act
    const result = await repository.findFirst({
      where: { status: "INACTIVE" },
    });

    // Assert
    expect(result).toBeNull();
  });
});

describe("SharedUserRepository - count", () => {
  let repository: SharedUserRepository;
  let mocks: UserRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedUserRepository());
  });

  it("counts users matching criteria", async () => {
    // Arrange
    mocks.prismaService.user.count.mockResolvedValue(5);

    // Act
    const result = await repository.count({
      where: { status: "ACTIVE" },
    });

    // Assert
    expect(mocks.prismaService.user.count).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
    });
    expect(result).toBe(5);
  });

  it("returns 0 when no users match", async () => {
    // Arrange
    mocks.prismaService.user.count.mockResolvedValue(0);

    // Act
    const result = await repository.count({
      where: { status: "INACTIVE" },
    });

    // Assert
    expect(result).toBe(0);
  });
});

describe("SharedUserRepository - findUniqueOrThrow", () => {
  let repository: SharedUserRepository;
  let mocks: UserRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedUserRepository());
  });

  it("finds unique user and throws on not found", async () => {
    // Arrange
    const user = makeUser();
    mocks.prismaService.user.findUniqueOrThrow.mockResolvedValue(user);

    // Act
    const result = await repository.findUniqueOrThrow({
      where: { id: USER_ID },
    });

    // Assert
    expect(mocks.prismaService.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: USER_ID },
    });
    expect(result).toEqual(user);
  });

  it("throws NotFoundException when user not found", async () => {
    // Arrange
    mocks.prismaService.user.findUniqueOrThrow.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.findUniqueOrThrow({
      where: { id: "nonexistent-id" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "User not found.",
      }),
    });
  });
});

describe("SharedUserRepository - createUser", () => {
  let repository: SharedUserRepository;
  let mocks: UserRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedUserRepository());
  });

  it("creates a user with provided arguments", async () => {
    // Arrange
    const user = makeUser();
    mocks.prismaService.user.create.mockResolvedValue(user);

    // Act
    const result = await repository.createUser({
      data: {
        email: "john@example.com",
        name: "John Doe",
        phoneNumber: "0987654321",
        password: "hashed-password",
        roleId: ROLE_ID,
      },
    });

    // Assert
    expect(mocks.prismaService.user.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          email: "john@example.com",
        }),
      }),
    );
    expect(result).toEqual(user);
  });

  it("throws UnprocessableEntityException on duplicate email", async () => {
    // Arrange
    mocks.prismaService.user.create.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.createUser({
      data: {
        email: "duplicate@example.com",
        name: "John Doe",
        phoneNumber: "0987654321",
        password: "hashed-password",
        roleId: ROLE_ID,
      },
    });

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
    mocks.prismaService.user.create.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.createUser({
      data: {
        email: "john@example.com",
        name: "John Doe",
        phoneNumber: "0987654321",
        password: "hashed-password",
        roleId: "invalid-role-id",
      },
    });

    // Assert
    await expect(promise).rejects.toThrow(UnprocessableEntityException);
  });
});

describe("SharedUserRepository - updateUser", () => {
  let repository: SharedUserRepository;
  let mocks: UserRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupSharedUserRepository());
  });

  it("updates a user with provided arguments", async () => {
    // Arrange
    const updatedUser = makeUser({ name: "Jane Doe" });
    mocks.prismaService.user.update.mockResolvedValue(updatedUser);

    // Act
    const result = await repository.updateUser({
      where: { id: USER_ID },
      data: { name: "Jane Doe" },
    });

    // Assert
    expect(mocks.prismaService.user.update).toHaveBeenCalledWith(
      containing({
        where: { id: USER_ID },
        data: { name: "Jane Doe" },
      }),
    );
    expect(result).toEqual(updatedUser);
  });

  it("throws NotFoundException when user not found", async () => {
    // Arrange
    mocks.prismaService.user.update.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.updateUser({
      where: { id: "nonexistent-id" },
      data: { name: "Updated" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });

  it("throws UnprocessableEntityException on foreign key violation", async () => {
    // Arrange
    mocks.prismaService.user.update.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.updateUser({
      where: { id: USER_ID },
      data: { roleId: "invalid-role" },
    });

    // Assert
    await expect(promise).rejects.toThrow(UnprocessableEntityException);
  });
});
