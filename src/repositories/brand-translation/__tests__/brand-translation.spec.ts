import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { BrandTranslationRepository } from "@/repositories/brand-translation/brand-translation.repository";

import {
  BRAND_ID,
  BRAND_TRANSLATION_ID,
  LANGUAGE_ID,
  USER_ID,
  anyDate,
  containing,
  stringContaining,
  makeBrand,
  makeBrandTranslation,
  setupBrandTranslationRepository,
  BrandTranslationMocks,
} from "./brand-translation-test-harness";

describe("BrandTranslationRepository - findManyBrandTranslations", () => {
  let repository: BrandTranslationRepository;
  let mocks: BrandTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandTranslationRepository());
  });

  it("returns translations and their count with filters", async () => {
    // Arrange
    const translations = [makeBrandTranslation()];
    mocks.prismaService.brandTranslation.findMany.mockResolvedValue(
      translations,
    );
    mocks.prismaService.brandTranslation.count.mockResolvedValue(1);

    // Act
    const result = await repository.findManyBrandTranslations({
      where: { brandId: BRAND_ID },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    // Assert
    expect(result).toEqual({
      brandTranslations: translations,
      brandTranslationsCount: 1,
    });
  });

  it("always filters out deleted translations", async () => {
    // Arrange
    mocks.prismaService.brandTranslation.findMany.mockResolvedValue([]);
    mocks.prismaService.brandTranslation.count.mockResolvedValue(0);

    // Act
    await repository.findManyBrandTranslations({
      where: {},
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    // Assert
    expect(mocks.prismaService.brandTranslation.findMany).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
      }),
    );
  });

  it("throws internal error on database failure", async () => {
    // Arrange
    mocks.prismaService.brandTranslation.findMany.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const promise = repository.findManyBrandTranslations({
      where: {},
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
      response: { message: "Failed to fetch brand translations." },
    });
  });
});

describe("BrandTranslationRepository - findUniqueBrandTranslation", () => {
  let repository: BrandTranslationRepository;
  let mocks: BrandTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandTranslationRepository());
  });

  it("returns a translation by ID", async () => {
    // Arrange
    const translation = makeBrandTranslation();
    mocks.prismaService.brandTranslation.findUniqueOrThrow.mockResolvedValue(
      translation,
    );

    // Act
    const result =
      await repository.findUniqueBrandTranslation(BRAND_TRANSLATION_ID);

    // Assert
    expect(result).toEqual(translation);
  });

  it("throws notFound error when translation does not exist", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.brandTranslation.findUniqueOrThrow.mockRejectedValue(
      error,
    );

    // Act
    const promise = repository.findUniqueBrandTranslation("non-existent");

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: {
        message: stringContaining("not found"),
      },
    });
  });
});

describe("BrandTranslationRepository - validateBrand", () => {
  let repository: BrandTranslationRepository;
  let mocks: BrandTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandTranslationRepository());
  });

  it("returns brand when it exists and is not deleted", async () => {
    // Arrange
    const brand = makeBrand();
    mocks.prismaService.brand.findUniqueOrThrow.mockResolvedValue(brand);

    // Act
    const result = await repository.validateBrand(BRAND_ID);

    // Assert
    expect(result).toEqual(brand);
  });

  it("throws notFound error when brand does not exist", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.brand.findUniqueOrThrow.mockRejectedValue(error);

    // Act
    const promise = repository.validateBrand("non-existent");

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: stringContaining("not found") },
    });
  });
});

describe("BrandTranslationRepository - createBrandTranslation", () => {
  let repository: BrandTranslationRepository;
  let mocks: BrandTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandTranslationRepository());
  });

  it("creates a translation with provided data", async () => {
    // Arrange
    const translation = makeBrandTranslation();
    const data = {
      brandId: BRAND_ID,
      languageId: LANGUAGE_ID,
      name: "Translation",
      description: "A test translation",
    };
    mocks.prismaService.brandTranslation.create.mockResolvedValue(translation);

    // Act
    const result = await repository.createBrandTranslation({ data });

    // Assert
    expect(result).toEqual(translation);
    expect(mocks.prismaService.brandTranslation.create).toHaveBeenCalledWith(
      containing({ data }),
    );
  });

  it("throws unprocessable error on unique constraint violation", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "6.0.0" },
    );
    mocks.prismaService.brandTranslation.create.mockRejectedValue(error);

    // Act
    const promise = repository.createBrandTranslation({
      data: {
        name: "Duplicate",
        brandId: BRAND_ID,
        languageId: LANGUAGE_ID,
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
    const error = new PrismaClientKnownRequestError("Foreign key constraint", {
      code: "P2003",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.brandTranslation.create.mockRejectedValue(error);

    // Act
    const promise = repository.createBrandTranslation({
      data: {
        brandId: "invalid",
        languageId: LANGUAGE_ID,
        name: "Test",
        description: "A test translation",
      },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: { message: stringContaining("foreign key") },
    });
  });
});

describe("BrandTranslationRepository - updateBrandTranslation", () => {
  let repository: BrandTranslationRepository;
  let mocks: BrandTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandTranslationRepository());
  });

  it("updates a translation with provided data", async () => {
    // Arrange
    const translation = makeBrandTranslation({ name: "Updated" });
    const data = { name: "Updated" };
    mocks.prismaService.brandTranslation.update.mockResolvedValue(translation);

    // Act
    const result = await repository.updateBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      data,
    });

    // Assert
    expect(result).toEqual(translation);
    expect(mocks.prismaService.brandTranslation.update).toHaveBeenCalledWith(
      containing({
        where: { id: BRAND_TRANSLATION_ID, deletedAt: null },
        data,
      }),
    );
  });

  it("throws notFound error when translation does not exist", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.brandTranslation.update.mockRejectedValue(error);

    // Act
    const promise = repository.updateBrandTranslation({
      id: "non-existent",
      data: { name: "Updated" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: stringContaining("not found") },
    });
  });
});

describe("BrandTranslationRepository - deleteBrandTranslation", () => {
  let repository: BrandTranslationRepository;
  let mocks: BrandTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandTranslationRepository());
  });

  it("soft deletes a translation", async () => {
    // Arrange
    const translation = makeBrandTranslation({ deletedAt: new Date() });
    mocks.prismaService.brandTranslation.update.mockResolvedValue(translation);

    // Act
    const result = await repository.deleteBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      userId: USER_ID,
    });

    // Assert
    expect(result).toEqual(translation);
    expect(mocks.prismaService.brandTranslation.update).toHaveBeenCalledWith(
      containing({
        where: { id: BRAND_TRANSLATION_ID, deletedAt: null },
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
    const error = new PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.brandTranslation.update.mockRejectedValue(error);

    // Act
    const promise = repository.deleteBrandTranslation({
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
