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

describe("CategoryTranslationService - updateCategoryTranslation", () => {
  let service: CategoryTranslationService;
  let mocks: CategoryTranslationServiceMocks;

  const makeData = (overrides: Record<string, unknown> = {}) => ({
    name: "Updated Name",
    description: "Updated Description",
    ...overrides,
  });

  beforeEach(async () => {
    ({ service, mocks } = await setupCategoryTranslationService());
    mocks.categoryTranslationRepository.validateCategory.mockResolvedValue({
      id: CATEGORY_ID,
    });
    mocks.categoryTranslationRepository.updateCategoryTranslation.mockResolvedValue(
      makeCategoryTranslation({ name: "Updated Name" }),
    );
  });

  it("updates translation without category change", async () => {
    // Arrange
    const data = makeData({ name: "New Name" });

    // Act
    await service.updateCategoryTranslation({
      id: TRANSLATION_ID,
      data,
      userId: USER_ID,
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.updateCategoryTranslation,
    ).toHaveBeenCalledWith(
      containing({
        id: TRANSLATION_ID,
        data: containing({ name: "New Name" }),
      }),
    );
    expect(
      mocks.categoryTranslationRepository.validateCategory,
    ).not.toHaveBeenCalled();
  });

  it("validates category when categoryId is provided in update", async () => {
    // Arrange
    const data = makeData({ categoryId: CATEGORY_ID });

    // Act
    await service.updateCategoryTranslation({
      id: TRANSLATION_ID,
      data,
      userId: USER_ID,
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.validateCategory,
    ).toHaveBeenCalledWith(CATEGORY_ID);
  });

  it("throws error when new category does not exist", async () => {
    // Arrange
    const data = makeData({ categoryId: "non-existent-category" });
    const notFoundError = new NotFoundException("Category not found");
    mocks.categoryTranslationRepository.validateCategory.mockRejectedValue(
      notFoundError,
    );

    // Act & Assert
    await expect(
      service.updateCategoryTranslation({
        id: TRANSLATION_ID,
        data,
        userId: USER_ID,
      }),
    ).rejects.toBe(notFoundError);
    expect(
      mocks.categoryTranslationRepository.updateCategoryTranslation,
    ).not.toHaveBeenCalled();
  });

  it("updates category association when categoryId is provided", async () => {
    // Arrange
    const newCategoryId = "new-category-id";
    const data = makeData({ categoryId: newCategoryId });
    mocks.categoryTranslationRepository.validateCategory.mockResolvedValue({
      id: newCategoryId,
    });

    // Act
    await service.updateCategoryTranslation({
      id: TRANSLATION_ID,
      data,
      userId: USER_ID,
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.updateCategoryTranslation,
    ).toHaveBeenCalledWith(
      containing({
        data: containing({ categoryId: newCategoryId }),
      }),
    );
  });

  it("stamps the updater ID onto the updated row", async () => {
    // Arrange
    const data = makeData();
    const updaterId = "specific-updater-id";

    // Act
    await service.updateCategoryTranslation({
      id: TRANSLATION_ID,
      data,
      userId: updaterId,
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.updateCategoryTranslation,
    ).toHaveBeenCalledWith(
      containing({
        data: containing({ updatedById: updaterId }),
      }),
    );
  });

  it("returns the updated translation untouched", async () => {
    // Arrange
    const data = makeData();
    const updated = makeCategoryTranslation({ name: "Updated" });
    mocks.categoryTranslationRepository.updateCategoryTranslation.mockResolvedValue(
      updated,
    );

    // Act
    const result = await service.updateCategoryTranslation({
      id: TRANSLATION_ID,
      data,
      userId: USER_ID,
    });

    // Assert
    expect(result).toBe(updated);
  });

  it("propagates not found error from repository", async () => {
    // Arrange
    const data = makeData();
    const notFoundError = new NotFoundException(
      "Category translation not found",
    );
    mocks.categoryTranslationRepository.updateCategoryTranslation.mockRejectedValue(
      notFoundError,
    );

    // Act & Assert
    await expect(
      service.updateCategoryTranslation({
        id: TRANSLATION_ID,
        data,
        userId: USER_ID,
      }),
    ).rejects.toBe(notFoundError);
  });

  it("propagates duplicate name error from repository", async () => {
    // Arrange
    const data = makeData({ name: "Existing Name" });
    const conflict = new UnprocessableEntityException(
      "Category translation with this name already exists.",
    );
    mocks.categoryTranslationRepository.updateCategoryTranslation.mockRejectedValue(
      conflict,
    );

    // Act & Assert
    await expect(
      service.updateCategoryTranslation({
        id: TRANSLATION_ID,
        data,
        userId: USER_ID,
      }),
    ).rejects.toBe(conflict);
  });
});
