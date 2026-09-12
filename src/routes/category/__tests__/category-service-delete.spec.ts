import { NotFoundException } from "@nestjs/common";

import { CategoryService } from "../category.service";

import {
  CATEGORY_ID,
  USER_ID,
  makeCategory,
  setupCategoryService,
  CategoryServiceMocks,
} from "./category-service-test-harness";

describe("CategoryService - deleteCategory", () => {
  let service: CategoryService;
  let mocks: CategoryServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupCategoryService());
  });

  it("deletes a category by ID", async () => {
    // Arrange
    const deleted = makeCategory({ deletedAt: new Date() });
    mocks.categoryRepository.deleteCategory.mockResolvedValue(deleted);

    // Act
    await service.deleteCategory({
      id: CATEGORY_ID,
      userId: USER_ID,
    });

    // Assert
    expect(mocks.categoryRepository.deleteCategory).toHaveBeenCalledWith({
      id: CATEGORY_ID,
      userId: USER_ID,
    });
  });

  it("returns the deleted category", async () => {
    // Arrange
    const deleted = makeCategory();
    mocks.categoryRepository.deleteCategory.mockResolvedValue(deleted);

    // Act
    const result = await service.deleteCategory({
      id: CATEGORY_ID,
      userId: USER_ID,
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe(CATEGORY_ID);
  });

  it("stamps the deleter ID onto the deleted row", async () => {
    // Arrange
    const deleterId = "specific-deleter-id";
    const deleted = makeCategory();
    mocks.categoryRepository.deleteCategory.mockResolvedValue(deleted);

    // Act
    await service.deleteCategory({
      id: CATEGORY_ID,
      userId: deleterId,
    });

    // Assert
    expect(mocks.categoryRepository.deleteCategory).toHaveBeenCalledWith({
      id: CATEGORY_ID,
      userId: deleterId,
    });
  });

  it("propagates not found error when category does not exist", async () => {
    // Arrange
    const notFoundError = new NotFoundException("Category not found");
    mocks.categoryRepository.deleteCategory.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(
      service.deleteCategory({
        id: CATEGORY_ID,
        userId: USER_ID,
      }),
    ).rejects.toBe(notFoundError);
  });

  it("propagates database errors from repository", async () => {
    // Arrange
    const dbError = new Error("Database connection failed");
    mocks.categoryRepository.deleteCategory.mockRejectedValue(dbError);

    // Act & Assert
    await expect(
      service.deleteCategory({
        id: CATEGORY_ID,
        userId: USER_ID,
      }),
    ).rejects.toBe(dbError);
  });

  it("passes the correct id and userId to the repository delete method", async () => {
    // Arrange
    const deleted = makeCategory({ id: CATEGORY_ID });
    mocks.categoryRepository.deleteCategory.mockResolvedValue(deleted);

    // Act
    await service.deleteCategory({
      id: CATEGORY_ID,
      userId: USER_ID,
    });

    // Assert
    expect(mocks.categoryRepository.deleteCategory).toHaveBeenCalledWith({
      id: CATEGORY_ID,
      userId: USER_ID,
    });
  });
});
