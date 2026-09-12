import { CategoryService } from "../category.service";

import {
  CATEGORY_ID,
  LANGUAGE_ID,
  PARENT_CATEGORY_ID,
  makeCategory,
  setupCategoryService,
  CategoryServiceMocks,
} from "./category-service-test-harness";

describe("CategoryService - getAllCategories", () => {
  let service: CategoryService;
  let mocks: CategoryServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupCategoryService());
  });

  it("fetches all categories without filters", async () => {
    // Arrange
    const categories = [makeCategory(), makeCategory({ id: "other-id" })];
    mocks.categoryRepository.findAllCategories.mockResolvedValue(categories);

    // Act
    const result = await service.getAllCategories({});

    // Assert
    expect(mocks.categoryRepository.findAllCategories).toHaveBeenCalledWith({
      languageId: undefined,
      parentCategoryId: undefined,
    });
    expect(result).toBe(categories);
  });

  it("filters by language ID only", async () => {
    // Arrange
    const categories = [makeCategory()];
    mocks.categoryRepository.findAllCategories.mockResolvedValue(categories);

    // Act
    await service.getAllCategories({ languageId: LANGUAGE_ID });

    // Assert
    expect(mocks.categoryRepository.findAllCategories).toHaveBeenCalledWith({
      languageId: LANGUAGE_ID,
      parentCategoryId: undefined,
    });
  });

  it("filters by parent category ID only", async () => {
    // Arrange
    const childCategories = [
      makeCategory({ parentCategoryId: PARENT_CATEGORY_ID }),
    ];
    mocks.categoryRepository.findAllCategories.mockResolvedValue(
      childCategories,
    );

    // Act
    await service.getAllCategories({ parentCategoryId: PARENT_CATEGORY_ID });

    // Assert
    expect(mocks.categoryRepository.findAllCategories).toHaveBeenCalledWith({
      languageId: undefined,
      parentCategoryId: PARENT_CATEGORY_ID,
    });
  });

  it("filters by both language ID and parent category ID", async () => {
    // Arrange
    const filteredCategories = [
      makeCategory({ parentCategoryId: PARENT_CATEGORY_ID }),
    ];
    mocks.categoryRepository.findAllCategories.mockResolvedValue(
      filteredCategories,
    );

    // Act
    await service.getAllCategories({
      languageId: LANGUAGE_ID,
      parentCategoryId: PARENT_CATEGORY_ID,
    });

    // Assert
    expect(mocks.categoryRepository.findAllCategories).toHaveBeenCalledWith({
      languageId: LANGUAGE_ID,
      parentCategoryId: PARENT_CATEGORY_ID,
    });
  });

  it("returns empty array when no categories match filters", async () => {
    // Arrange
    mocks.categoryRepository.findAllCategories.mockResolvedValue([]);

    // Act
    const result = await service.getAllCategories({
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(result).toEqual([]);
  });

  it("returns categories with translations when present", async () => {
    // Arrange
    const categoriesWithTranslations = [
      makeCategory({
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
      }),
    ];
    mocks.categoryRepository.findAllCategories.mockResolvedValue(
      categoriesWithTranslations,
    );

    // Act
    const result = await service.getAllCategories({ languageId: LANGUAGE_ID });

    // Assert
    expect(result[0].categoryTranslations).toHaveLength(1);
    expect(result[0].categoryTranslations[0].name).toBe("Electronics EN");
  });

  it("propagates repository errors", async () => {
    // Arrange
    const error = new Error("Database error");
    mocks.categoryRepository.findAllCategories.mockRejectedValue(error);

    // Act & Assert
    await expect(service.getAllCategories({})).rejects.toBe(error);
  });
});
