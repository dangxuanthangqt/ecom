import { UnprocessableEntityException } from "@nestjs/common";

import { CategoryService } from "../category.service";

import {
  TRANSLATION_ID,
  USER_ID,
  containing,
  makeCategory,
  setupCategoryService,
  CategoryServiceMocks,
} from "./category-service-test-harness";

describe("CategoryService - createCategory", () => {
  let service: CategoryService;
  let mocks: CategoryServiceMocks;

  const makeBody = (overrides: Record<string, unknown> = {}) => ({
    name: "New Category",
    logo: "https://example.com/new-category.jpg",
    parentCategoryId: undefined,
    categoryTranslationIds: [],
    ...overrides,
  });

  beforeEach(async () => {
    ({ service, mocks } = await setupCategoryService());
    mocks.categoryRepository.createCategory.mockResolvedValue(
      makeCategory({ name: "New Category" }),
    );
  });

  it("creates a category with minimal data", async () => {
    // Arrange
    const body = makeBody({ name: "Electronics" });

    // Act
    await service.createCategory({ body, userId: USER_ID });

    // Assert
    expect(mocks.categoryRepository.createCategory).toHaveBeenCalledWith(
      containing({
        data: containing({
          name: "Electronics",
          createdById: USER_ID,
        }),
        categoryTranslationIds: [],
      }),
    );
  });

  it("includes logo when provided", async () => {
    // Arrange
    const logoUrl = "https://example.com/logo.jpg";
    const body = makeBody({ logo: logoUrl });

    // Act
    await service.createCategory({ body, userId: USER_ID });

    // Assert
    expect(mocks.categoryRepository.createCategory).toHaveBeenCalledWith(
      containing({
        data: containing({ logo: logoUrl }),
      }),
    );
  });

  it("associates category translations when provided", async () => {
    // Arrange
    const translationIds = [TRANSLATION_ID, "trans-2"];
    const body = makeBody({ categoryTranslationIds: translationIds });

    // Act
    await service.createCategory({ body, userId: USER_ID });

    // Assert
    expect(mocks.categoryRepository.createCategory).toHaveBeenCalledWith(
      containing({
        categoryTranslationIds: translationIds,
      }),
    );
  });

  it("sets parent category when provided", async () => {
    // Arrange
    const parentId = "parent-id";
    const body = makeBody({ parentCategoryId: parentId });

    // Act
    await service.createCategory({ body, userId: USER_ID });

    // Assert
    expect(mocks.categoryRepository.createCategory).toHaveBeenCalledWith(
      containing({
        data: containing({ parentCategoryId: parentId }),
      }),
    );
  });

  it("stamps the creator ID onto the new row", async () => {
    // Arrange
    const body = makeBody();
    const creatorId = "specific-user-id";

    // Act
    await service.createCategory({ body, userId: creatorId });

    // Assert
    expect(mocks.categoryRepository.createCategory).toHaveBeenCalledWith(
      containing({
        data: containing({ createdById: creatorId }),
      }),
    );
  });

  it("returns the created category untouched", async () => {
    // Arrange
    const created = makeCategory({ name: "Returned Category" });
    mocks.categoryRepository.createCategory.mockResolvedValue(created);
    const body = makeBody();

    // Act
    const result = await service.createCategory({ body, userId: USER_ID });

    // Assert
    expect(result).toBe(created);
  });

  it("propagates duplicate name error from repository", async () => {
    // Arrange
    const conflict = new UnprocessableEntityException(
      "Category is already exists.",
    );
    mocks.categoryRepository.createCategory.mockRejectedValue(conflict);
    const body = makeBody();

    // Act & Assert
    await expect(
      service.createCategory({ body, userId: USER_ID }),
    ).rejects.toBe(conflict);
  });

  it("propagates foreign key constraint error from repository", async () => {
    // Arrange
    const fkError = new UnprocessableEntityException(
      "Failed to create category due to foreign key constraint.",
    );
    mocks.categoryRepository.createCategory.mockRejectedValue(fkError);
    const body = makeBody({ parentCategoryId: "non-existent-parent" });

    // Act & Assert
    await expect(
      service.createCategory({ body, userId: USER_ID }),
    ).rejects.toBe(fkError);
  });
});
