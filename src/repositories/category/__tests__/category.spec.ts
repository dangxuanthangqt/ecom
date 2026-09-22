import { Prisma } from "@/generated/prisma/client";
import { CategoryRepository } from "@/repositories/category/category.repository";

import {
  CATEGORY_ID,
  CATEGORY_TRANSLATION_ID,
  PARENT_CATEGORY_ID,
  USER_ID,
  anyDate,
  containing,
  stringContaining,
  makeCategory,
  makeCategoryTranslation,
  setupCategoryRepository,
  CategoryMocks,
} from "./category-test-harness";

describe("CategoryRepository - findAllCategories", () => {
  let repository: CategoryRepository;
  let mocks: CategoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryRepository());
  });

  it("returns all non-deleted categories", async () => {
    // Arrange
    const categories = [makeCategory()];
    mocks.prismaService.category.findMany.mockResolvedValue(categories);

    // Act
    const result = await repository.findAllCategories({});

    // Assert
    expect(result).toEqual(categories);
    expect(mocks.prismaService.category.findMany).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
      }),
    );
  });

  it("filters by parent category ID when provided", async () => {
    // Arrange
    const categories = [makeCategory({ parentCategoryId: PARENT_CATEGORY_ID })];
    mocks.prismaService.category.findMany.mockResolvedValue(categories);

    // Act
    await repository.findAllCategories({
      parentCategoryId: PARENT_CATEGORY_ID,
    });

    // Assert
    expect(mocks.prismaService.category.findMany).toHaveBeenCalledWith(
      containing({
        where: containing({
          deletedAt: null,
          parentCategoryId: PARENT_CATEGORY_ID,
        }),
      }),
    );
  });

  it("orders categories by createdAt descending", async () => {
    // Arrange
    const categories = [makeCategory()];
    mocks.prismaService.category.findMany.mockResolvedValue(categories);

    // Act
    await repository.findAllCategories({});

    // Assert
    expect(mocks.prismaService.category.findMany).toHaveBeenCalledWith(
      containing({
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("throws internal error on database failure", async () => {
    // Arrange
    mocks.prismaService.category.findMany.mockImplementation(() => {
      throw new Error("Database error");
    });

    // Act
    const promise = repository.findAllCategories({});

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
      response: { message: "Failed to fetch categories" },
    });
  });
});

describe("CategoryRepository - findCategoryById", () => {
  let repository: CategoryRepository;
  let mocks: CategoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryRepository());
  });

  it("returns a category by ID", async () => {
    // Arrange
    const category = makeCategory();
    mocks.prismaService.category.findUniqueOrThrow.mockResolvedValue(category);

    // Act
    const result = await repository.findCategoryById({
      id: CATEGORY_ID,
    });

    // Assert
    expect(result).toEqual(category);
  });

  it("throws notFound error when category does not exist", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.category.findUniqueOrThrow.mockRejectedValue(error);

    // Act
    const promise = repository.findCategoryById({
      id: "non-existent",
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Category not found" },
    });
  });
});

describe("CategoryRepository - createCategory", () => {
  let repository: CategoryRepository;
  let mocks: CategoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryRepository());
  });

  it("creates a category with provided data and no translations", async () => {
    // Arrange
    const category = makeCategory();
    const data = { name: "New Category" };
    mocks.prismaService.category.create.mockResolvedValue(category);

    // Act
    const result = await repository.createCategory({ data });

    // Assert
    expect(result).toEqual(category);
    expect(mocks.prismaService.category.create).toHaveBeenCalledWith(
      containing({
        data: containing(data),
      }),
    );
  });

  it("creates a category with translations when IDs are provided", async () => {
    // Arrange
    const category = makeCategory();
    const data = { name: "New Category" };
    mocks.prismaService.categoryTranslation.findMany.mockResolvedValue([
      makeCategoryTranslation({ id: CATEGORY_TRANSLATION_ID }),
    ]);
    mocks.prismaService.category.create.mockResolvedValue(category);

    // Act
    await repository.createCategory({
      data,
      categoryTranslationIds: [CATEGORY_TRANSLATION_ID],
    });

    // Assert
    expect(mocks.prismaService.category.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          ...data,
          categoryTranslations: {
            connect: [{ id: CATEGORY_TRANSLATION_ID }],
          },
        }),
      }),
    );
  });

  it("throws unprocessable error on unique constraint", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint",
      {
        code: "P2002",
        clientVersion: "6.0.0",
      },
    );
    mocks.prismaService.category.create.mockRejectedValue(error);

    // Act
    const promise = repository.createCategory({
      data: { name: "Duplicate" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: { message: stringContaining("already exists") },
    });
  });

  it("throws unprocessable error on foreign key constraint", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Foreign key", {
      code: "P2003",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.category.create.mockRejectedValue(error);

    // Act
    const promise = repository.createCategory({
      data: { name: "Category" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: {
        message: stringContaining("foreign key constraint"),
      },
    });
  });
});

describe("CategoryRepository - updateCategory", () => {
  let repository: CategoryRepository;
  let mocks: CategoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryRepository());
  });

  it("updates a category with provided data", async () => {
    // Arrange
    const category = makeCategory({ name: "Updated" });
    const data = { name: "Updated" };
    mocks.prismaService.category.update.mockResolvedValue(category);

    // Act
    const result = await repository.updateCategory({
      id: CATEGORY_ID,
      data,
    });

    // Assert
    expect(result).toEqual(category);
    expect(mocks.prismaService.category.update).toHaveBeenCalledWith(
      containing({
        where: { id: CATEGORY_ID, deletedAt: null },
        data: containing(data),
      }),
    );
  });

  it("prevents a category from being its own parent", async () => {
    // Arrange
    const data = { parentCategoryId: CATEGORY_ID };

    // Act
    const promise = repository.updateCategory({
      id: CATEGORY_ID,
      data,
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: {
        message: "A category cannot be its own parent.",
      },
    });
  });

  it("throws notFound error when category does not exist", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.category.update.mockRejectedValue(error);

    // Act
    const promise = repository.updateCategory({
      id: "non-existent",
      data: { name: "Updated" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Category not found" },
    });
  });

  it("throws unprocessable error on unique constraint", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint",
      {
        code: "P2002",
        clientVersion: "6.0.0",
      },
    );
    mocks.prismaService.category.update.mockRejectedValue(error);

    // Act
    const promise = repository.updateCategory({
      id: CATEGORY_ID,
      data: { name: "Existing Name" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: {
        message: stringContaining("already exists"),
      },
    });
  });
});

describe("CategoryRepository - deleteCategory", () => {
  let repository: CategoryRepository;
  let mocks: CategoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCategoryRepository());
  });

  it("soft deletes a category", async () => {
    // Arrange
    const category = makeCategory({ deletedAt: new Date() });
    mocks.prismaService.category.update.mockResolvedValue(category);

    // Act
    const result = await repository.deleteCategory({
      id: CATEGORY_ID,
      userId: USER_ID,
    });

    // Assert
    expect(result).toEqual(category);
    expect(mocks.prismaService.category.update).toHaveBeenCalledWith(
      containing({
        where: { id: CATEGORY_ID, deletedAt: null },
        data: containing({
          deletedAt: anyDate(),
          updatedById: USER_ID,
          deletedById: USER_ID,
        }),
      }),
    );
  });

  it("throws notFound error when category does not exist", async () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.category.update.mockRejectedValue(error);

    // Act
    const promise = repository.deleteCategory({
      id: "non-existent",
      userId: USER_ID,
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Category not found" },
    });
  });
});
