import { RefreshTokenRepository } from "../refresh-token.repository";

import {
  setupRefreshTokenRepository,
  REFRESH_TOKEN_VALUE,
  DEVICE_ID,
  USER_ID,
  makeRefreshToken,
  containing,
  RefreshTokenRepositoryMocks,
  createPrismaUniqueError,
  createPrismaNotFoundError,
  createPrismaForeignKeyError,
} from "./refresh-token-repository-test-harness";

describe("RefreshTokenRepository - findUniqueOrThrow", () => {
  let repository: RefreshTokenRepository;
  let mocks: RefreshTokenRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupRefreshTokenRepository());
  });

  it("finds a unique refresh token by provided arguments", async () => {
    // Arrange
    const token = makeRefreshToken();
    mocks.prismaService.refreshToken.findUniqueOrThrow.mockResolvedValue(token);

    // Act
    const result = await repository.findUniqueOrThrow({
      where: { token: REFRESH_TOKEN_VALUE },
    });

    // Assert
    expect(
      mocks.prismaService.refreshToken.findUniqueOrThrow,
    ).toHaveBeenCalledWith({
      where: { token: REFRESH_TOKEN_VALUE },
    });
    expect(result).toEqual(token);
  });

  it("throws NotFoundException when token not found", async () => {
    // Arrange
    mocks.prismaService.refreshToken.findUniqueOrThrow.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.findUniqueOrThrow({
      where: { token: "nonexistent-token" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Refresh token not found.",
      }),
    });
  });

  it("throws InternalServerErrorException on other errors", async () => {
    // Arrange
    mocks.prismaService.refreshToken.findUniqueOrThrow.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const promise = repository.findUniqueOrThrow({
      where: { token: REFRESH_TOKEN_VALUE },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("RefreshTokenRepository - delete", () => {
  let repository: RefreshTokenRepository;
  let mocks: RefreshTokenRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupRefreshTokenRepository());
  });

  it("deletes a refresh token by provided arguments", async () => {
    // Arrange
    const token = makeRefreshToken();
    mocks.prismaService.refreshToken.delete.mockResolvedValue(token);

    // Act
    const result = await repository.delete({
      where: { token: REFRESH_TOKEN_VALUE },
    });

    // Assert
    expect(mocks.prismaService.refreshToken.delete).toHaveBeenCalledWith({
      where: { token: REFRESH_TOKEN_VALUE },
    });
    expect(result).toEqual(token);
  });

  it("throws InternalServerErrorException on delete failure", async () => {
    // Arrange
    mocks.prismaService.refreshToken.delete.mockRejectedValue(
      new Error("Delete failed"),
    );

    // Act
    const promise = repository.delete({
      where: { token: REFRESH_TOKEN_VALUE },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Failed to delete refresh token.",
      }),
    });
  });
});

describe("RefreshTokenRepository - createRefreshToken", () => {
  let repository: RefreshTokenRepository;
  let mocks: RefreshTokenRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupRefreshTokenRepository());
  });

  it("creates a refresh token with provided data", async () => {
    // Arrange
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    mocks.prismaService.refreshToken.create.mockResolvedValue(undefined);

    // Act
    await repository.createRefreshToken({
      userId: USER_ID,
      token: "token-value",
      expiresAt,
      deviceId: DEVICE_ID,
    });

    // Assert
    expect(mocks.prismaService.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        token: "token-value",
        expiresAt,
        deviceId: DEVICE_ID,
      },
    });
  });

  it("throws UnprocessableEntityException on duplicate token", async () => {
    // Arrange
    mocks.prismaService.refreshToken.create.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.createRefreshToken({
      userId: USER_ID,
      token: "duplicate-token",
      expiresAt: new Date(),
      deviceId: DEVICE_ID,
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Refresh token already exists.",
      }),
    });
  });

  it("throws UnprocessableEntityException on invalid user foreign key", async () => {
    // Arrange
    mocks.prismaService.refreshToken.create.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.createRefreshToken({
      userId: "invalid-user-id",
      token: "token-value",
      expiresAt: new Date(),
      deviceId: DEVICE_ID,
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Invalid foreign key constraint.",
      }),
    });
  });

  it("throws InternalServerErrorException on other errors", async () => {
    // Arrange
    mocks.prismaService.refreshToken.create.mockRejectedValue(
      new Error("Unexpected error"),
    );

    // Act
    const promise = repository.createRefreshToken({
      userId: USER_ID,
      token: "token-value",
      expiresAt: new Date(),
      deviceId: DEVICE_ID,
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Failed to create refresh token.",
      }),
    });
  });
});
