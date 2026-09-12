import { CategoryController } from "../category.controller";

import {
  ACTIVE_USER_ID,
  CATEGORY_ID,
  LANGUAGE_ID,
  containing,
  makeCategoryResponse,
  setupCategoryController,
  CategoryControllerMocks,
} from "./category-controller-test-harness";

describe("CategoryController - getAllCategories", () => {
  let controller: CategoryController;
  let mocks: CategoryControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCategoryController());
  });

  it("calls the service with languageId and parentCategoryId and returns wrapped result", async () => {
    // Arrange
    const category = makeCategoryResponse();
    const serviceResponse = [category];
    mocks.categoryService.getAllCategories.mockResolvedValue(serviceResponse);

    const queryDto = { parentCategoryId: undefined };

    // Act
    const result = await controller.getAllCategories(LANGUAGE_ID, queryDto);

    // Assert
    expect(mocks.categoryService.getAllCategories).toHaveBeenCalledWith(
      containing({
        languageId: LANGUAGE_ID,
        parentCategoryId: queryDto.parentCategoryId,
      }),
    );
    expect(result.data).toEqual(serviceResponse);
    expect(result.totalCount).toBe(1);
  });

  it("handles optional parentCategoryId parameter", async () => {
    // Arrange
    const category = makeCategoryResponse();
    mocks.categoryService.getAllCategories.mockResolvedValue([category]);

    const parentId = "55555555-5555-4555-8555-555555555555";
    const queryDto = { parentCategoryId: parentId };

    // Act
    await controller.getAllCategories(LANGUAGE_ID, queryDto);

    // Assert
    expect(mocks.categoryService.getAllCategories).toHaveBeenCalledWith(
      containing({
        languageId: LANGUAGE_ID,
        parentCategoryId: parentId,
      }),
    );
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Database error");
    mocks.categoryService.getAllCategories.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.getAllCategories(LANGUAGE_ID, { parentCategoryId: undefined }),
    ).rejects.toBe(error);
  });
});

describe("CategoryController - getCategoryById", () => {
  let controller: CategoryController;
  let mocks: CategoryControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCategoryController());
  });

  it("calls the service with id and languageId and returns wrapped result", async () => {
    // Arrange
    const category = makeCategoryResponse();
    mocks.categoryService.getCategoryById.mockResolvedValue(category);

    // Act
    const result = await controller.getCategoryById(LANGUAGE_ID, CATEGORY_ID);

    // Assert
    expect(mocks.categoryService.getCategoryById).toHaveBeenCalledWith(
      containing({
        id: CATEGORY_ID,
        languageId: LANGUAGE_ID,
      }),
    );
    expect(result).toEqual(category);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Category not found");
    mocks.categoryService.getCategoryById.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.getCategoryById(LANGUAGE_ID, CATEGORY_ID),
    ).rejects.toBe(error);
  });
});

describe("CategoryController - createCategory", () => {
  let controller: CategoryController;
  let mocks: CategoryControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCategoryController());
  });

  it("calls the service with body and userId and returns wrapped result", async () => {
    // Arrange
    const category = makeCategoryResponse();
    mocks.categoryService.createCategory.mockResolvedValue(category);

    const body = {
      name: "New Category",
      description: "Description",
      icon: "folder",
    };

    // Act
    const result = await controller.createCategory(body, ACTIVE_USER_ID);

    // Assert
    expect(mocks.categoryService.createCategory).toHaveBeenCalledWith(
      containing({
        body,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(category);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Validation failed");
    mocks.categoryService.createCategory.mockRejectedValue(error);

    const body = { name: "Test" };

    // Act & Assert
    await expect(controller.createCategory(body, ACTIVE_USER_ID)).rejects.toBe(
      error,
    );
  });
});

describe("CategoryController - updateCategory", () => {
  let controller: CategoryController;
  let mocks: CategoryControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCategoryController());
  });

  it("calls the service with id, body, and userId and returns wrapped result", async () => {
    // Arrange
    const category = makeCategoryResponse();
    mocks.categoryService.updateCategory.mockResolvedValue(category);

    const body = { name: "Updated Category" };

    // Act
    const result = await controller.updateCategory(
      CATEGORY_ID,
      ACTIVE_USER_ID,
      body,
    );

    // Assert
    expect(mocks.categoryService.updateCategory).toHaveBeenCalledWith(
      containing({
        id: CATEGORY_ID,
        body,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(category);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Category not found");
    mocks.categoryService.updateCategory.mockRejectedValue(error);

    const body = { name: "Updated" };

    // Act & Assert
    await expect(
      controller.updateCategory(CATEGORY_ID, ACTIVE_USER_ID, body),
    ).rejects.toBe(error);
  });
});

describe("CategoryController - deleteCategory", () => {
  let controller: CategoryController;
  let mocks: CategoryControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCategoryController());
  });

  it("calls the service with id and userId and returns wrapped result", async () => {
    // Arrange
    const category = makeCategoryResponse({ deletedAt: new Date() });
    mocks.categoryService.deleteCategory.mockResolvedValue(category);

    // Act
    const result = await controller.deleteCategory(CATEGORY_ID, ACTIVE_USER_ID);

    // Assert
    expect(mocks.categoryService.deleteCategory).toHaveBeenCalledWith(
      containing({
        id: CATEGORY_ID,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(category);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Category not found");
    mocks.categoryService.deleteCategory.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.deleteCategory(CATEGORY_ID, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});
