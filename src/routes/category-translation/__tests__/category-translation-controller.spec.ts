import { CategoryTranslationController } from "../category-translation.controller";

import {
  ACTIVE_USER_ID,
  CATEGORY_TRANSLATION_ID,
  containing,
  makeCategoryTranslationResponse,
  setupCategoryTranslationController,
  CategoryTranslationControllerMocks,
} from "./category-translation-controller-test-harness";

describe("CategoryTranslationController - getCategoryTranslations", () => {
  let controller: CategoryTranslationController;
  let mocks: CategoryTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCategoryTranslationController());
  });

  it("calls the service with query and returns wrapped result", async () => {
    // Arrange
    const categoryTranslation = makeCategoryTranslationResponse();
    const response = {
      data: [categoryTranslation],
      pagination: {
        pageIndex: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 1,
      },
    };
    mocks.categoryTranslationService.getCategoryTranslations.mockResolvedValue(
      response,
    );

    const query = { pageIndex: 1, pageSize: 10 };

    // Act
    const result = await controller.getCategoryTranslations(query);

    // Assert
    expect(
      mocks.categoryTranslationService.getCategoryTranslations,
    ).toHaveBeenCalledWith(query);
    expect(result.data).toEqual([categoryTranslation]);
    expect(result.pagination).toEqual(response.pagination);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Database error");
    mocks.categoryTranslationService.getCategoryTranslations.mockRejectedValue(
      error,
    );

    // Act & Assert
    await expect(
      controller.getCategoryTranslations({ pageIndex: 1, pageSize: 10 }),
    ).rejects.toBe(error);
  });
});

describe("CategoryTranslationController - getCategoryTranslationById", () => {
  let controller: CategoryTranslationController;
  let mocks: CategoryTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCategoryTranslationController());
  });

  it("calls the service with id and returns wrapped result", async () => {
    // Arrange
    const categoryTranslation = makeCategoryTranslationResponse();
    mocks.categoryTranslationService.getCategoryTranslationById.mockResolvedValue(
      categoryTranslation,
    );

    // Act
    const result = await controller.getCategoryTranslationById(
      CATEGORY_TRANSLATION_ID,
    );

    // Assert
    expect(
      mocks.categoryTranslationService.getCategoryTranslationById,
    ).toHaveBeenCalledWith(CATEGORY_TRANSLATION_ID);
    expect(result).toEqual(categoryTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Not found");
    mocks.categoryTranslationService.getCategoryTranslationById.mockRejectedValue(
      error,
    );

    // Act & Assert
    await expect(
      controller.getCategoryTranslationById(CATEGORY_TRANSLATION_ID),
    ).rejects.toBe(error);
  });
});

describe("CategoryTranslationController - createCategoryTranslation", () => {
  let controller: CategoryTranslationController;
  let mocks: CategoryTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCategoryTranslationController());
  });

  it("calls the service with data and userId and returns wrapped result", async () => {
    // Arrange
    const categoryTranslation = makeCategoryTranslationResponse();
    mocks.categoryTranslationService.createCategoryTranslation.mockResolvedValue(
      categoryTranslation,
    );

    const data = {
      categoryId: "33333333-3333-4333-8333-333333333333",
      languageId: "44444444-4444-4444-8444-444444444444",
      name: "Category Name",
      description: "Description",
    };

    // Act
    const result = await controller.createCategoryTranslation(
      data,
      ACTIVE_USER_ID,
    );

    // Assert
    expect(
      mocks.categoryTranslationService.createCategoryTranslation,
    ).toHaveBeenCalledWith(
      containing({
        data,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(categoryTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Validation failed");
    mocks.categoryTranslationService.createCategoryTranslation.mockRejectedValue(
      error,
    );

    const data = {
      categoryId: "some-id",
      languageId: "some-lang",
      name: "Test",
      description: "Test description",
    };

    // Act & Assert
    await expect(
      controller.createCategoryTranslation(data, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});

describe("CategoryTranslationController - updateCategoryTranslation", () => {
  let controller: CategoryTranslationController;
  let mocks: CategoryTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCategoryTranslationController());
  });

  it("calls the service with id, data, and userId and returns wrapped result", async () => {
    // Arrange
    const categoryTranslation = makeCategoryTranslationResponse();
    mocks.categoryTranslationService.updateCategoryTranslation.mockResolvedValue(
      categoryTranslation,
    );

    const data = { name: "Updated Name" };

    // Act
    const result = await controller.updateCategoryTranslation(
      CATEGORY_TRANSLATION_ID,
      data,
      ACTIVE_USER_ID,
    );

    // Assert
    expect(
      mocks.categoryTranslationService.updateCategoryTranslation,
    ).toHaveBeenCalledWith(
      containing({
        id: CATEGORY_TRANSLATION_ID,
        data,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(categoryTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Not found");
    mocks.categoryTranslationService.updateCategoryTranslation.mockRejectedValue(
      error,
    );

    const data = { name: "Updated" };

    // Act & Assert
    await expect(
      controller.updateCategoryTranslation(
        CATEGORY_TRANSLATION_ID,
        data,
        ACTIVE_USER_ID,
      ),
    ).rejects.toBe(error);
  });
});

describe("CategoryTranslationController - deleteCategoryTranslation", () => {
  let controller: CategoryTranslationController;
  let mocks: CategoryTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCategoryTranslationController());
  });

  it("calls the service with id and userId and returns wrapped result", async () => {
    // Arrange
    const categoryTranslation = makeCategoryTranslationResponse({
      deletedAt: new Date(),
    });
    mocks.categoryTranslationService.deleteCategoryTranslation.mockResolvedValue(
      categoryTranslation,
    );

    // Act
    const result = await controller.deleteCategoryTranslation(
      CATEGORY_TRANSLATION_ID,
      ACTIVE_USER_ID,
    );

    // Assert
    expect(
      mocks.categoryTranslationService.deleteCategoryTranslation,
    ).toHaveBeenCalledWith(
      containing({
        id: CATEGORY_TRANSLATION_ID,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(categoryTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Not found");
    mocks.categoryTranslationService.deleteCategoryTranslation.mockRejectedValue(
      error,
    );

    // Act & Assert
    await expect(
      controller.deleteCategoryTranslation(
        CATEGORY_TRANSLATION_ID,
        ACTIVE_USER_ID,
      ),
    ).rejects.toBe(error);
  });
});
