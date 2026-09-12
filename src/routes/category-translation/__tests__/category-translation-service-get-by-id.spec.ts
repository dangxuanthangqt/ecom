import { NotFoundException } from "@nestjs/common";

import { CategoryTranslationService } from "../category-translation.service";

import {
  TRANSLATION_ID,
  CATEGORY_ID,
  LANGUAGE_ID,
  makeCategoryTranslation,
  setupCategoryTranslationService,
  CategoryTranslationServiceMocks,
} from "./category-translation-service-test-harness";

describe("CategoryTranslationService - getCategoryTranslationById", () => {
  let service: CategoryTranslationService;
  let mocks: CategoryTranslationServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupCategoryTranslationService());
  });

  it("fetches a translation by ID", async () => {
    // Arrange
    const translation = makeCategoryTranslation();
    mocks.categoryTranslationRepository.findUniqueCategoryTranslation.mockResolvedValue(
      translation,
    );

    // Act
    const result = await service.getCategoryTranslationById(TRANSLATION_ID);

    // Assert
    expect(
      mocks.categoryTranslationRepository.findUniqueCategoryTranslation,
    ).toHaveBeenCalledWith(TRANSLATION_ID);
    expect(result).toBe(translation);
  });

  it("returns translation with language details", async () => {
    // Arrange
    const translation = makeCategoryTranslation({
      language: { id: LANGUAGE_ID, name: "English" },
    });
    mocks.categoryTranslationRepository.findUniqueCategoryTranslation.mockResolvedValue(
      translation,
    );

    // Act
    const result = await service.getCategoryTranslationById(TRANSLATION_ID);

    // Assert
    expect(result.language).toBeDefined();
    expect(result.language.id).toBe(LANGUAGE_ID);
  });

  it("returns translation with category details", async () => {
    // Arrange
    const translation = makeCategoryTranslation({
      category: {
        id: CATEGORY_ID,
        name: "Electronics",
        logo: "https://example.com/logo.jpg",
      },
    });
    mocks.categoryTranslationRepository.findUniqueCategoryTranslation.mockResolvedValue(
      translation,
    );

    // Act
    const result = await service.getCategoryTranslationById(TRANSLATION_ID);

    // Assert
    expect(result.category).toBeDefined();
    expect(result.category?.id).toBe(CATEGORY_ID);
  });

  it("propagates not found error from repository", async () => {
    // Arrange
    const notFoundError = new NotFoundException(
      "Category translation not found",
    );
    mocks.categoryTranslationRepository.findUniqueCategoryTranslation.mockRejectedValue(
      notFoundError,
    );

    // Act & Assert
    await expect(
      service.getCategoryTranslationById(TRANSLATION_ID),
    ).rejects.toBe(notFoundError);
  });

  it("propagates database errors from repository", async () => {
    // Arrange
    const dbError = new Error("Database connection failed");
    mocks.categoryTranslationRepository.findUniqueCategoryTranslation.mockRejectedValue(
      dbError,
    );

    // Act & Assert
    await expect(
      service.getCategoryTranslationById(TRANSLATION_ID),
    ).rejects.toBe(dbError);
  });
});
