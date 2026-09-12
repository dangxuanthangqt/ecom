import { LanguageRepository } from "../language.repository";

import {
  setupLanguageRepository,
  LANGUAGE_ID,
  USER_ID,
  makeLanguage,
  containing,
  stringContaining,
  anyObject,
  LanguageRepositoryMocks,
  createPrismaUniqueError,
  createPrismaNotFoundError,
  createPrismaForeignKeyError,
} from "./language-repository-test-harness";

describe("LanguageRepository - findManyLanguages", () => {
  let repository: LanguageRepository;
  let mocks: LanguageRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupLanguageRepository());
  });

  it("fetches multiple active languages with pagination", async () => {
    // Arrange
    const languages = [
      makeLanguage({ id: "en", name: "English" }),
      makeLanguage({ id: "vi", name: "Vietnamese" }),
    ];
    mocks.prismaService.language.findMany.mockResolvedValue(languages);
    mocks.prismaService.language.count.mockResolvedValue(2);

    // Act
    const result = await repository.findManyLanguages({
      take: 10,
      skip: 0,
    });

    // Assert
    expect(mocks.prismaService.language.findMany).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
        take: 10,
        skip: 0,
      }),
    );
    expect(result).toEqual({ languages, languagesCount: 2 });
  });

  it("excludes deleted languages", async () => {
    // Arrange
    mocks.prismaService.language.findMany.mockResolvedValue([]);
    mocks.prismaService.language.count.mockResolvedValue(0);

    // Act
    await repository.findManyLanguages({});

    // Assert
    expect(mocks.prismaService.language.findMany).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
      }),
    );
  });

  it("applies orderBy clause", async () => {
    // Arrange
    mocks.prismaService.language.findMany.mockResolvedValue([]);
    mocks.prismaService.language.count.mockResolvedValue(0);

    // Act
    await repository.findManyLanguages({
      orderBy: { name: "asc" },
    });

    // Assert
    expect(mocks.prismaService.language.findMany).toHaveBeenCalledWith(
      containing({
        orderBy: { name: "asc" },
      }),
    );
  });
});

describe("LanguageRepository - findUniqueLanguage", () => {
  let repository: LanguageRepository;
  let mocks: LanguageRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupLanguageRepository());
  });

  it("fetches a unique language by id", async () => {
    // Arrange
    const language = makeLanguage({ id: LANGUAGE_ID });
    mocks.prismaService.language.findUniqueOrThrow.mockResolvedValue(language);

    // Act
    const result = await repository.findUniqueLanguage(LANGUAGE_ID);

    // Assert
    expect(mocks.prismaService.language.findUniqueOrThrow).toHaveBeenCalledWith(
      {
        where: { id: LANGUAGE_ID, deletedAt: null },
        select: anyObject(),
      },
    );
    expect(result).toEqual(language);
  });

  it("throws NotFoundException when language not found", async () => {
    // Arrange
    mocks.prismaService.language.findUniqueOrThrow.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.findUniqueLanguage("nonexistent-id");

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: stringContaining("not found"),
      }),
    });
  });
});

describe("LanguageRepository - createLanguage", () => {
  let repository: LanguageRepository;
  let mocks: LanguageRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupLanguageRepository());
  });

  it("creates a language with provided data", async () => {
    // Arrange
    const language = makeLanguage({ id: "fr", name: "French" });
    mocks.prismaService.language.create.mockResolvedValue(language);

    // Act
    const result = await repository.createLanguage({
      id: "fr",
      name: "French",
      createdById: USER_ID,
    });

    // Assert
    expect(mocks.prismaService.language.create).toHaveBeenCalledWith({
      data: {
        id: "fr",
        name: "French",
        createdById: USER_ID,
      },
      select: anyObject(),
    });
    expect(result).toEqual(language);
  });

  it("throws UnprocessableEntityException on duplicate language id", async () => {
    // Arrange
    mocks.prismaService.language.create.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.createLanguage({
      id: "en",
      name: "English",
      createdById: USER_ID,
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: stringContaining("already exists"),
      }),
    });
  });

  it("throws UnprocessableEntityException on foreign key constraint", async () => {
    // Arrange
    mocks.prismaService.language.create.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.createLanguage({
      id: "de",
      name: "German",
      createdById: "invalid-user-id",
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("LanguageRepository - updateLanguageById", () => {
  let repository: LanguageRepository;
  let mocks: LanguageRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupLanguageRepository());
  });

  it("updates a language by id", async () => {
    // Arrange
    const updated = makeLanguage({ name: "English (Updated)" });
    mocks.prismaService.language.update.mockResolvedValue(updated);

    // Act
    const result = await repository.updateLanguageById({
      where: { id: LANGUAGE_ID },
      data: { name: "English (Updated)", updatedById: USER_ID },
    });

    // Assert
    expect(mocks.prismaService.language.update).toHaveBeenCalledWith({
      where: { id: LANGUAGE_ID, deletedAt: null },
      data: { name: "English (Updated)", updatedById: USER_ID },
      select: anyObject(),
    });
    expect(result).toEqual(updated);
  });

  it("throws NotFoundException when language not found", async () => {
    // Arrange
    mocks.prismaService.language.update.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.updateLanguageById({
      where: { id: "nonexistent-id" },
      data: { name: "Updated", updatedById: USER_ID },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: stringContaining("not found"),
      }),
    });
  });

  it("throws UnprocessableEntityException on duplicate language id", async () => {
    // Arrange
    mocks.prismaService.language.update.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.updateLanguageById({
      where: { id: LANGUAGE_ID },
      data: { name: "Updated", updatedById: USER_ID },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });

  it("throws UnprocessableEntityException on foreign key constraint", async () => {
    // Arrange
    mocks.prismaService.language.update.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.updateLanguageById({
      where: { id: LANGUAGE_ID },
      data: { name: "Updated", updatedById: "invalid-user-id" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("LanguageRepository - deleteLanguageById", () => {
  let repository: LanguageRepository;
  let mocks: LanguageRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupLanguageRepository());
  });

  it("hard deletes a language by id", async () => {
    // Arrange
    const deletedLanguage = makeLanguage({ id: LANGUAGE_ID });
    mocks.prismaService.language.delete.mockResolvedValue(deletedLanguage);

    // Act
    const result = await repository.deleteLanguageById({ id: LANGUAGE_ID });

    // Assert
    expect(mocks.prismaService.language.delete).toHaveBeenCalledWith({
      where: { id: LANGUAGE_ID },
      select: anyObject(),
    });
    expect(result).toEqual(deletedLanguage);
  });

  it("throws NotFoundException when language not found", async () => {
    // Arrange
    mocks.prismaService.language.delete.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.deleteLanguageById({ id: "nonexistent-id" });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: stringContaining("not found"),
      }),
    });
  });
});
