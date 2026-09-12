import { NotFoundException } from "@nestjs/common";

import { CategoryService } from "../category.service";

import {
  CATEGORY_ID,
  LANGUAGE_ID,
  containing,
  makeCategory,
  setupCategoryService,
  CategoryServiceMocks,
} from "./category-service-test-harness";

describe("CategoryService - getCategoryById", () => {
  let service: CategoryService;
  let mocks: CategoryServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupCategoryService());
  });

  it("fetches a category by ID without language filter", async () => {
    // Arrange
    const category = makeCategory();
    mocks.categoryRepository.findCategoryById.mockResolvedValue(category);

    // Act
    const result = await service.getCategoryById({ id: CATEGORY_ID });

    // Assert
    expect(mocks.categoryRepository.findCategoryById).toHaveBeenCalledWith({
      id: CATEGORY_ID,
      languageId: undefined,
    });
    expect(result).toBe(category);
  });

  it("fetches a category by ID with language filter", async () => {
    // Arrange
    const categoryWithTranslation = makeCategory({
      categoryTranslations: [
        {
          id: "trans-1",
          name: "Electronics EN",
          description: "Electronic devices",
          languageId: LANGUAGE_ID,
          categoryId: CATEGORY_ID,
          createdById: "user-1",
          updatedById: null,
          deletedById: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          language: { id: LANGUAGE_ID, name: "English" },
        },
      ],
    });
    mocks.categoryRepository.findCategoryById.mockResolvedValue(
      categoryWithTranslation,
    );

    // Act
    const result = await service.getCategoryById({
      id: CATEGORY_ID,
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.categoryRepository.findCategoryById).toHaveBeenCalledWith({
      id: CATEGORY_ID,
      languageId: LANGUAGE_ID,
    });
    expect(result.categoryTranslations).toHaveLength(1);
  });

  it("propagates not found error from repository", async () => {
    // Arrange
    const notFoundError = new NotFoundException("Category not found");
    mocks.categoryRepository.findCategoryById.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(service.getCategoryById({ id: CATEGORY_ID })).rejects.toBe(
      notFoundError,
    );
  });

  it("propagates database errors from repository", async () => {
    // Arrange
    const dbError = new Error("Database connection failed");
    mocks.categoryRepository.findCategoryById.mockRejectedValue(dbError);

    // Act & Assert
    await expect(service.getCategoryById({ id: CATEGORY_ID })).rejects.toBe(
      dbError,
    );
  });

  it("returns category with parent category details when present", async () => {
    // Arrange
    const categoryWithParent = makeCategory({
      parentCategoryId: "parent-id",
      parentCategory: {
        id: "parent-id",
        name: "Parent Category",
        logo: null,
      },
    });
    mocks.categoryRepository.findCategoryById.mockResolvedValue(
      categoryWithParent,
    );

    // Act
    const result = await service.getCategoryById({ id: CATEGORY_ID });

    // Assert
    expect(result.parentCategory).toBeDefined();
    expect(result.parentCategory?.id).toBe("parent-id");
  });

  it("returns category with child categories when present", async () => {
    // Arrange
    const categoryWithChildren = makeCategory({
      childrenCategories: [
        {
          id: "child-1",
          name: "Child Category",
          logo: null,
        },
      ],
    });
    mocks.categoryRepository.findCategoryById.mockResolvedValue(
      categoryWithChildren,
    );

    // Act
    const result = await service.getCategoryById({ id: CATEGORY_ID });

    // Assert
    expect(result.childrenCategories).toHaveLength(1);
  });
});
