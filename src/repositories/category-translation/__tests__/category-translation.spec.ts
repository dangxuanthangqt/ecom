import { Prisma } from "@/generated/prisma/client";
import { CategoryTranslationRepository } from "@/repositories/category-translation/category-translation.repository";

import {
  CATEGORY_ID,
  CATEGORY_TRANSLATION_ID,
  LANGUAGE_ID,
  USER_ID,
  anyDate,
  containing,
  stringContaining,
  makeCategory,
  makeCategoryTranslation,
  setupCategoryTranslationRepository,
  CategoryTranslationMocks,
} from "./category-translation-test-harness";

describe("CategoryTranslationRepository - findManyCategoryTranslations", () => {
  let repository: CategoryTranslationRepository;
  let mocks: CategoryTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryTranslationRepository());
  });

  it("returns translations and their count with filters", async () => {
    // Arrange
    const translations = [makeCategoryTranslation()];
    mocks.prismaService.categoryTranslation.findMany.mockResolvedValue(
      translations,
    );
    mocks.prismaService.categoryTranslation.count.mockResolvedValue(1);

    // Act
    const result = await repository.findManyCategoryTranslations({
      where: { categoryId: CATEGORY_ID },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    // Assert
    expect(result).toEqual({
      categoryTranslations: translations,
      categoryTranslationsCount: 1,
    });
  });

  it("always filters out deleted translations", async () => {
    // Arrange
    mocks.prismaService.categoryTranslation.findMany.mockResolvedValue([]);
    mocks.prismaService.categoryTranslation.count.mockResolvedValue(0);

    // Act
    await repository.findManyCategoryTranslations({
      where: {},
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    // Assert
    expect(
      mocks.prismaService.categoryTranslation.findMany,
    ).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
      }),
    );
  });

  it("throws internal error on database failure", async () => {
    // Arrange
    mocks.prismaService.categoryTranslation.findMany.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const promise = repository.findManyCategoryTranslations({
      where: {},
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
      response: { message: "Failed to fetch category translations" },
    });
  });
});

describe("CategoryTranslationRepository - findUniqueCategoryTranslation", () => {
  let repository: CategoryTranslationRepository;
  let mocks: CategoryTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryTranslationRepository());
  });

  it("returns a translation by ID", async () => {
    // Arrange
    const translation = makeCategoryTranslation();
    mocks.prismaService.categoryTranslation.findUniqueOrThrow.mockResolvedValue(
      translation,
    );

    // Act
    const result = await repository.findUniqueCategoryTranslation(
      CATEGORY_TRANSLATION_ID,
    );

    // Assert
    expect(result).toEqual(translation);
  });

  it("throws notFound error when translation does not exist", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.categoryTranslation.findUniqueOrThrow.mockRejectedValue(
      error,
    );

    // Act
    const promise = repository.findUniqueCategoryTranslation("non-existent");

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Category translation not found" },
    });
  });
});

describe("CategoryTranslationRepository - validateCategory", () => {
  let repository: CategoryTranslationRepository;
  let mocks: CategoryTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryTranslationRepository());
  });

  it("returns category when it exists and is not deleted", async () => {
    // Arrange
    const category = makeCategory();
    mocks.prismaService.category.findUniqueOrThrow.mockResolvedValue(category);

    // Act
    const result = await repository.validateCategory(CATEGORY_ID);

    // Assert
    expect(result).toEqual(category);
  });

  it("throws notFound error when category does not exist", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.category.findUniqueOrThrow.mockRejectedValue(error);

    // Act
    const promise = repository.validateCategory("non-existent");

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Category not found" },
    });
  });
});

describe("CategoryTranslationRepository - createCategoryTranslation", () => {
  let repository: CategoryTranslationRepository;
  let mocks: CategoryTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryTranslationRepository());
  });

  it("creates a translation with provided data", async () => {
    // Arrange
    const translation = makeCategoryTranslation();
    const data = {
      categoryId: CATEGORY_ID,
      languageId: LANGUAGE_ID,
      name: "Translation",
      description: "A test translation",
    };
    mocks.prismaService.categoryTranslation.create.mockResolvedValue(
      translation,
    );

    // Act
    const result = await repository.createCategoryTranslation({ data });

    // Assert
    expect(result).toEqual(translation);
    expect(mocks.prismaService.categoryTranslation.create).toHaveBeenCalledWith(
      containing({ data }),
    );
  });

  it("throws unprocessable error on unique constraint violation", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "6.0.0" },
    );
    mocks.prismaService.categoryTranslation.create.mockRejectedValue(error);

    // Act
    const promise = repository.createCategoryTranslation({
      data: {
        name: "Duplicate",
        languageId: LANGUAGE_ID,
        categoryId: CATEGORY_ID,
        description: "A duplicate translation",
      },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: { message: stringContaining("already exists") },
    });
  });

  it("throws unprocessable error on foreign key constraint", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint",
      {
        code: "P2003",
        clientVersion: "6.0.0",
      },
    );
    mocks.prismaService.categoryTranslation.create.mockRejectedValue(error);

    // Act
    const promise = repository.createCategoryTranslation({
      data: {
        categoryId: "invalid",
        languageId: LANGUAGE_ID,
        name: "Test",
        description: "A test translation",
      },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: {
        message: stringContaining("foreign key constraint"),
      },
    });
  });
});

describe("CategoryTranslationRepository - updateCategoryTranslation", () => {
  let repository: CategoryTranslationRepository;
  let mocks: CategoryTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryTranslationRepository());
  });

  it("updates a translation with provided data", async () => {
    // Arrange
    const translation = makeCategoryTranslation({ name: "Updated" });
    const data = { name: "Updated" };
    mocks.prismaService.categoryTranslation.update.mockResolvedValue(
      translation,
    );

    // Act
    const result = await repository.updateCategoryTranslation({
      id: CATEGORY_TRANSLATION_ID,
      data,
    });

    // Assert
    expect(result).toEqual(translation);
    expect(mocks.prismaService.categoryTranslation.update).toHaveBeenCalledWith(
      containing({
        where: { id: CATEGORY_TRANSLATION_ID, deletedAt: null },
        data,
      }),
    );
  });

  it("throws notFound error when translation does not exist", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.categoryTranslation.update.mockRejectedValue(error);

    // Act
    const promise = repository.updateCategoryTranslation({
      id: "non-existent",
      data: { name: "Updated" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: stringContaining("not found") },
    });
  });

  it("throws unprocessable error on unique constraint", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint",
      {
        code: "P2002",
        clientVersion: "6.0.0",
      },
    );
    mocks.prismaService.categoryTranslation.update.mockRejectedValue(error);

    // Act
    const promise = repository.updateCategoryTranslation({
      id: CATEGORY_TRANSLATION_ID,
      data: { name: "Existing Name" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: {
        message: stringContaining("already exists"),
      },
    });
  });
});

describe("CategoryTranslationRepository - deleteCategoryTranslation", () => {
  let repository: CategoryTranslationRepository;
  let mocks: CategoryTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryTranslationRepository());
  });

  it("soft deletes a translation", async () => {
    // Arrange
    const translation = makeCategoryTranslation({ deletedAt: new Date() });
    mocks.prismaService.categoryTranslation.update.mockResolvedValue(
      translation,
    );

    // Act
    const result = await repository.deleteCategoryTranslation({
      id: CATEGORY_TRANSLATION_ID,
      userId: USER_ID,
    });

    // Assert
    expect(result).toEqual(translation);
    expect(mocks.prismaService.categoryTranslation.update).toHaveBeenCalledWith(
      containing({
        where: { id: CATEGORY_TRANSLATION_ID, deletedAt: null },
        data: containing({
          deletedAt: anyDate(),
          deletedById: USER_ID,
          updatedById: USER_ID,
        }),
      }),
    );
  });

  it("throws notFound error when translation does not exist", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.categoryTranslation.update.mockRejectedValue(error);

    // Act
    const promise = repository.deleteCategoryTranslation({
      id: "non-existent",
      userId: USER_ID,
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: stringContaining("not found") },
    });
  });
});
