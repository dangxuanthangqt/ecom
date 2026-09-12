import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";

import { CategoryTranslationService } from "../category-translation.service";

import {
  TRANSLATION_ID,
  CATEGORY_ID,
  LANGUAGE_ID,
  USER_ID,
  containing,
  makeCategoryTranslation,
  setupCategoryTranslationService,
  CategoryTranslationServiceMocks,
} from "./category-translation-service-test-harness";

describe("CategoryTranslationService - createCategoryTranslation", () => {
  let service: CategoryTranslationService;
  let mocks: CategoryTranslationServiceMocks;

  const makeData = (overrides: Record<string, unknown> = {}) => ({
    name: "Electronics",
    description: "Electronic devices",
    languageId: LANGUAGE_ID,
    categoryId: CATEGORY_ID,
    ...overrides,
  });

  beforeEach(async () => {
    ({ service, mocks } = await setupCategoryTranslationService());
    mocks.categoryTranslationRepository.validateCategory.mockResolvedValue({
      id: CATEGORY_ID,
    });
    mocks.categoryTranslationRepository.createCategoryTranslation.mockResolvedValue(
      makeCategoryTranslation(),
    );
  });

  it("validates category before creating translation", async () => {
    // Arrange
    const data = makeData();

    // Act
    await service.createCategoryTranslation({ data, userId: USER_ID });

    // Assert
    expect(
      mocks.categoryTranslationRepository.validateCategory,
    ).toHaveBeenCalledWith(CATEGORY_ID);
  });

  it("throws error when category does not exist", async () => {
    // Arrange
    const data = makeData();
    const notFoundError = new NotFoundException("Category not found");
    mocks.categoryTranslationRepository.validateCategory.mockRejectedValue(
      notFoundError,
    );

    // Act & Assert
    await expect(
      service.createCategoryTranslation({ data, userId: USER_ID }),
    ).rejects.toBe(notFoundError);
    expect(
      mocks.categoryTranslationRepository.createCategoryTranslation,
    ).not.toHaveBeenCalled();
  });

  it("creates translation with provided data", async () => {
    // Arrange
    const data = makeData({
      name: "Custom Name",
      description: "Custom Description",
    });

    // Act
    await service.createCategoryTranslation({ data, userId: USER_ID });

    // Assert
    expect(
      mocks.categoryTranslationRepository.createCategoryTranslation,
    ).toHaveBeenCalledWith(
      containing({
        data: containing({
          name: "Custom Name",
          description: "Custom Description",
          languageId: LANGUAGE_ID,
          categoryId: CATEGORY_ID,
        }),
      }),
    );
  });

  it("stamps the creator ID onto the new row", async () => {
    // Arrange
    const data = makeData();
    const creatorId = "specific-creator-id";

    // Act
    await service.createCategoryTranslation({ data, userId: creatorId });

    // Assert
    expect(
      mocks.categoryTranslationRepository.createCategoryTranslation,
    ).toHaveBeenCalledWith(
      containing({
        data: containing({ createdById: creatorId }),
      }),
    );
  });

  it("returns the created translation untouched", async () => {
    // Arrange
    const data = makeData();
    const created = makeCategoryTranslation({ name: "Returned Translation" });
    mocks.categoryTranslationRepository.createCategoryTranslation.mockResolvedValue(
      created,
    );

    // Act
    const result = await service.createCategoryTranslation({
      data,
      userId: USER_ID,
    });

    // Assert
    expect(result).toBe(created);
  });

  it("propagates duplicate name error from repository", async () => {
    // Arrange
    const data = makeData();
    const conflict = new UnprocessableEntityException(
      "Category translation with this name already exists.",
    );
    mocks.categoryTranslationRepository.createCategoryTranslation.mockRejectedValue(
      conflict,
    );

    // Act & Assert
    await expect(
      service.createCategoryTranslation({ data, userId: USER_ID }),
    ).rejects.toBe(conflict);
  });

  it("propagates foreign key constraint error from repository", async () => {
    // Arrange
    const data = makeData({ categoryId: "non-existent-category" });
    const fkError = new UnprocessableEntityException(
      "Failed to create category translation due to foreign key constraint.",
    );
    mocks.categoryTranslationRepository.validateCategory.mockResolvedValue({
      id: "non-existent-category",
    });
    mocks.categoryTranslationRepository.createCategoryTranslation.mockRejectedValue(
      fkError,
    );

    // Act & Assert
    await expect(
      service.createCategoryTranslation({ data, userId: USER_ID }),
    ).rejects.toBe(fkError);
  });
});
