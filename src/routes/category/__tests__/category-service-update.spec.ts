import {
  UnprocessableEntityException,
  NotFoundException,
} from "@nestjs/common";

import { CategoryService } from "../category.service";

import {
  CATEGORY_ID,
  TRANSLATION_ID,
  USER_ID,
  containing,
  makeCategory,
  setupCategoryService,
  CategoryServiceMocks,
} from "./category-service-test-harness";

describe("CategoryService - updateCategory", () => {
  let service: CategoryService;
  let mocks: CategoryServiceMocks;

  const makeBody = (overrides: Record<string, unknown> = {}) => ({
    name: "Updated Category",
    logo: undefined,
    categoryTranslationIds: undefined,
    ...overrides,
  });

  beforeEach(async () => {
    ({ service, mocks } = await setupCategoryService());
    mocks.categoryRepository.updateCategory.mockResolvedValue(
      makeCategory({ name: "Updated Category" }),
    );
  });

  it("updates only the name field", async () => {
    // Arrange
    const body = makeBody({ name: "New Name" });

    // Act
    await service.updateCategory({
      id: CATEGORY_ID,
      body,
      userId: USER_ID,
    });

    // Assert
    expect(mocks.categoryRepository.updateCategory).toHaveBeenCalledWith(
      containing({
        id: CATEGORY_ID,
        data: containing({ name: "New Name" }),
      }),
    );
  });

  it("updates the logo field", async () => {
    // Arrange
    const newLogoUrl = "https://example.com/new-logo.jpg";
    const body = makeBody({ logo: newLogoUrl });

    // Act
    await service.updateCategory({
      id: CATEGORY_ID,
      body,
      userId: USER_ID,
    });

    // Assert
    expect(mocks.categoryRepository.updateCategory).toHaveBeenCalledWith(
      containing({
        data: containing({ logo: newLogoUrl }),
      }),
    );
  });

  it("updates parent category", async () => {
    // Arrange
    const newParentId = "new-parent-id";
    const body = makeBody({ parentCategoryId: newParentId });

    // Act
    await service.updateCategory({
      id: CATEGORY_ID,
      body,
      userId: USER_ID,
    });

    // Assert
    expect(mocks.categoryRepository.updateCategory).toHaveBeenCalledWith(
      containing({
        data: containing({ parentCategoryId: newParentId }),
      }),
    );
  });

  it("associates new translations when provided", async () => {
    // Arrange
    const newTranslationIds = [TRANSLATION_ID, "trans-2"];
    const body = makeBody({ categoryTranslationIds: newTranslationIds });

    // Act
    await service.updateCategory({
      id: CATEGORY_ID,
      body,
      userId: USER_ID,
    });

    // Assert
    expect(mocks.categoryRepository.updateCategory).toHaveBeenCalledWith(
      containing({
        categoryTranslationIds: newTranslationIds,
      }),
    );
  });

  it("stamps the updater ID onto the updated row", async () => {
    // Arrange
    const updaterId = "specific-updater-id";
    const body = makeBody();

    // Act
    await service.updateCategory({
      id: CATEGORY_ID,
      body,
      userId: updaterId,
    });

    // Assert
    expect(mocks.categoryRepository.updateCategory).toHaveBeenCalledWith(
      containing({
        data: containing({ updatedById: updaterId }),
      }),
    );
  });

  it("returns the updated category untouched", async () => {
    // Arrange
    const updated = makeCategory({ name: "Updated" });
    mocks.categoryRepository.updateCategory.mockResolvedValue(updated);
    const body = makeBody();

    // Act
    const result = await service.updateCategory({
      id: CATEGORY_ID,
      body,
      userId: USER_ID,
    });

    // Assert
    expect(result).toBe(updated);
  });

  it("propagates not found error from repository", async () => {
    // Arrange
    const notFoundError = new NotFoundException("Category not found");
    mocks.categoryRepository.updateCategory.mockRejectedValue(notFoundError);
    const body = makeBody();

    // Act & Assert
    await expect(
      service.updateCategory({
        id: CATEGORY_ID,
        body,
        userId: USER_ID,
      }),
    ).rejects.toBe(notFoundError);
  });

  it("propagates duplicate name error from repository", async () => {
    // Arrange
    const conflict = new UnprocessableEntityException(
      "Category with this name already exists.",
    );
    mocks.categoryRepository.updateCategory.mockRejectedValue(conflict);
    const body = makeBody({ name: "Existing Name" });

    // Act & Assert
    await expect(
      service.updateCategory({
        id: CATEGORY_ID,
        body,
        userId: USER_ID,
      }),
    ).rejects.toBe(conflict);
  });

  it("propagates self-parent error from repository", async () => {
    // Arrange
    const selfParentError = new UnprocessableEntityException(
      "A category cannot be its own parent.",
    );
    mocks.categoryRepository.updateCategory.mockRejectedValue(selfParentError);
    const body = makeBody({ parentCategoryId: CATEGORY_ID });

    // Act & Assert
    await expect(
      service.updateCategory({
        id: CATEGORY_ID,
        body,
        userId: USER_ID,
      }),
    ).rejects.toBe(selfParentError);
  });
});
