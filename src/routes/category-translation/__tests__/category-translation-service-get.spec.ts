import { ORDER, ORDER_BY } from "@/constants/order";

import { CategoryTranslationService } from "../category-translation.service";

import {
  LANGUAGE_ID,
  containing,
  makeCategoryTranslation,
  setupCategoryTranslationService,
  CategoryTranslationServiceMocks,
} from "./category-translation-service-test-harness";

describe("CategoryTranslationService - getCategoryTranslations", () => {
  let service: CategoryTranslationService;
  let mocks: CategoryTranslationServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupCategoryTranslationService());
  });

  it("fetches translations with default pagination and ordering", async () => {
    // Arrange
    const translations = [makeCategoryTranslation()];
    mocks.categoryTranslationRepository.findManyCategoryTranslations.mockResolvedValue(
      {
        categoryTranslations: translations,
        categoryTranslationsCount: 1,
      },
    );

    // Act
    const result = await service.getCategoryTranslations({});

    // Assert
    expect(
      mocks.categoryTranslationRepository.findManyCategoryTranslations,
    ).toHaveBeenCalledWith(
      containing({
        take: 10,
        skip: 0,
        orderBy: { createdAt: "asc" },
      }),
    );
    expect(result.data).toEqual(translations);
  });

  it("uses custom page index and size", async () => {
    // Arrange
    mocks.categoryTranslationRepository.findManyCategoryTranslations.mockResolvedValue(
      {
        categoryTranslations: [],
        categoryTranslationsCount: 0,
      },
    );

    // Act
    await service.getCategoryTranslations({
      pageIndex: 2,
      pageSize: 20,
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.findManyCategoryTranslations,
    ).toHaveBeenCalledWith(
      containing({
        skip: 20,
        take: 20,
      }),
    );
  });

  it("calculates skip correctly based on page index", async () => {
    // Arrange
    mocks.categoryTranslationRepository.findManyCategoryTranslations.mockResolvedValue(
      {
        categoryTranslations: [],
        categoryTranslationsCount: 0,
      },
    );

    // Act
    await service.getCategoryTranslations({
      pageIndex: 3,
      pageSize: 10,
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.findManyCategoryTranslations,
    ).toHaveBeenCalledWith(
      containing({
        skip: 20,
        take: 10,
      }),
    );
  });

  it("filters by keyword case-insensitively", async () => {
    // Arrange
    mocks.categoryTranslationRepository.findManyCategoryTranslations.mockResolvedValue(
      {
        categoryTranslations: [],
        categoryTranslationsCount: 0,
      },
    );

    // Act
    await service.getCategoryTranslations({ keyword: "ELECTRONICS" });

    // Assert
    expect(
      mocks.categoryTranslationRepository.findManyCategoryTranslations,
    ).toHaveBeenCalledWith(
      containing({
        where: containing({
          name: containing({
            contains: "ELECTRONICS",
            mode: "insensitive",
          }),
        }),
      }),
    );
  });

  it("orders by custom field", async () => {
    // Arrange
    mocks.categoryTranslationRepository.findManyCategoryTranslations.mockResolvedValue(
      {
        categoryTranslations: [],
        categoryTranslationsCount: 0,
      },
    );

    // Act
    await service.getCategoryTranslations({
      orderBy: "name",
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.findManyCategoryTranslations,
    ).toHaveBeenCalledWith(
      containing({
        orderBy: { name: "asc" },
      }),
    );
  });

  it("normalizes order to lowercase for Prisma", async () => {
    // Arrange
    mocks.categoryTranslationRepository.findManyCategoryTranslations.mockResolvedValue(
      {
        categoryTranslations: [],
        categoryTranslationsCount: 0,
      },
    );

    // Act
    await service.getCategoryTranslations({
      order: "desc",
      orderBy: "updatedAt",
    });

    // Assert
    expect(
      mocks.categoryTranslationRepository.findManyCategoryTranslations,
    ).toHaveBeenCalledWith(
      containing({
        orderBy: { updatedAt: "desc" },
      }),
    );
  });

  it("calculates total pages correctly", async () => {
    // Arrange
    mocks.categoryTranslationRepository.findManyCategoryTranslations.mockResolvedValue(
      {
        categoryTranslations: [],
        categoryTranslationsCount: 25,
      },
    );

    // Act
    const result = await service.getCategoryTranslations({
      pageSize: 10,
    });

    // Assert
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.totalItems).toBe(25);
  });

  it("returns pagination metadata with result", async () => {
    // Arrange
    const translations = [makeCategoryTranslation()];
    mocks.categoryTranslationRepository.findManyCategoryTranslations.mockResolvedValue(
      {
        categoryTranslations: translations,
        categoryTranslationsCount: 1,
      },
    );

    // Act
    const result = await service.getCategoryTranslations({
      pageIndex: 1,
      pageSize: 10,
    });

    // Assert
    expect(result.pagination).toEqual({
      pageIndex: 1,
      pageSize: 10,
      totalPages: 1,
      totalItems: 1,
    });
  });

  it("returns empty array when no translations match", async () => {
    // Arrange
    mocks.categoryTranslationRepository.findManyCategoryTranslations.mockResolvedValue(
      {
        categoryTranslations: [],
        categoryTranslationsCount: 0,
      },
    );

    // Act
    const result = await service.getCategoryTranslations({ keyword: "xyz" });

    // Assert
    expect(result.data).toEqual([]);
  });
});
