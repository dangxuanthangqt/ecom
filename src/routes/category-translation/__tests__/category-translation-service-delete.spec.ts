import { NotFoundException } from "@nestjs/common";

import { CategoryTranslationService } from "../category-translation.service";

import {
  TRANSLATION_ID,
  USER_ID,
  containing,
  makeCategoryTranslation,
  setupCategoryTranslationService,
  CategoryTranslationServiceMocks,
} from "./category-translation-service-test-harness";

describe("CategoryTranslationService - deleteCategoryTranslation", () => {
  let service: CategoryTranslationService;
  let mocks: CategoryTranslationServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupCategoryTranslationService());
  });

  it("deletes a translation by ID", async () => {
    // Arrange
    const deleted = makeCategoryTranslation({ deletedAt: new Date() });
    mocks.categoryTranslationRepository.deleteCategoryTranslation.mockResolvedValue(
      deleted,
    );

    // Act
    await service.deleteCategoryTranslation({
      id: TRANSLATION_ID,
      userId: USER_ID,
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.deleteCategoryTranslation,
    ).toHaveBeenCalledWith({
      id: TRANSLATION_ID,
      userId: USER_ID,
    });
  });

  it("returns the deleted translation", async () => {
    // Arrange
    const deleted = makeCategoryTranslation();
    mocks.categoryTranslationRepository.deleteCategoryTranslation.mockResolvedValue(
      deleted,
    );

    // Act
    const result = await service.deleteCategoryTranslation({
      id: TRANSLATION_ID,
      userId: USER_ID,
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe(TRANSLATION_ID);
  });

  it("stamps the deleter ID onto the deleted row", async () => {
    // Arrange
    const deleterId = "specific-deleter-id";
    const deleted = makeCategoryTranslation();
    mocks.categoryTranslationRepository.deleteCategoryTranslation.mockResolvedValue(
      deleted,
    );

    // Act
    await service.deleteCategoryTranslation({
      id: TRANSLATION_ID,
      userId: deleterId,
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.deleteCategoryTranslation,
    ).toHaveBeenCalledWith({
      id: TRANSLATION_ID,
      userId: deleterId,
    });
  });

  it("propagates not found error when translation does not exist", async () => {
    // Arrange
    const notFoundError = new NotFoundException(
      "Category translation not found",
    );
    mocks.categoryTranslationRepository.deleteCategoryTranslation.mockRejectedValue(
      notFoundError,
    );

    // Act & Assert
    await expect(
      service.deleteCategoryTranslation({
        id: TRANSLATION_ID,
        userId: USER_ID,
      }),
    ).rejects.toBe(notFoundError);
  });

  it("propagates database errors from repository", async () => {
    // Arrange
    const dbError = new Error("Database connection failed");
    mocks.categoryTranslationRepository.deleteCategoryTranslation.mockRejectedValue(
      dbError,
    );

    // Act & Assert
    await expect(
      service.deleteCategoryTranslation({
        id: TRANSLATION_ID,
        userId: USER_ID,
      }),
    ).rejects.toBe(dbError);
  });

  it("passes the correct id and userId to the repository delete method", async () => {
    // Arrange
    const deleted = makeCategoryTranslation({ id: TRANSLATION_ID });
    mocks.categoryTranslationRepository.deleteCategoryTranslation.mockResolvedValue(
      deleted,
    );

    // Act
    await service.deleteCategoryTranslation({
      id: TRANSLATION_ID,
      userId: USER_ID,
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.deleteCategoryTranslation,
    ).toHaveBeenCalledWith({
      id: TRANSLATION_ID,
      userId: USER_ID,
    });
  });
});
