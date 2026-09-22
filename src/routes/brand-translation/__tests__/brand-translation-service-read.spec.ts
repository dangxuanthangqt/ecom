import { NotFoundException } from "@nestjs/common";

import { ORDER, ORDER_BY } from "@/constants/order";

import { BrandTranslationService } from "../brand-translation.service";

import {
  BRAND_TRANSLATION_ID,
  containing,
  makeBrandTranslation,
  setupBrandTranslationService,
  BrandTranslationServiceMocks,
} from "./brand-translation-service-test-harness";

describe("BrandTranslationService - getBrandTranslationById", () => {
  let service: BrandTranslationService;
  let mocks: BrandTranslationServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupBrandTranslationService());
  });

  it("returns the brand translation with the specified ID", async () => {
    // Arrange
    const translation = makeBrandTranslation({
      name: "Nike EN",
      languageId: "en",
    });
    mocks.brandTranslationRepository.findUniqueBrandTranslation.mockResolvedValue(
      translation,
    );

    // Act
    const result = await service.getBrandTranslationById(BRAND_TRANSLATION_ID);

    // Assert
    expect(result).toBe(translation);
    expect(
      mocks.brandTranslationRepository.findUniqueBrandTranslation,
    ).toHaveBeenCalledWith(BRAND_TRANSLATION_ID);
  });

  it("propagates not-found error from the repository", async () => {
    // Arrange
    const notFound = new NotFoundException({
      message: "Brand translation not found.",
    });
    mocks.brandTranslationRepository.findUniqueBrandTranslation.mockRejectedValue(
      notFound,
    );

    // Act
    const promise = service.getBrandTranslationById(BRAND_TRANSLATION_ID);

    // Assert
    await expect(promise).rejects.toBe(notFound);
  });

  it("includes the brand and language in the result", async () => {
    // Arrange
    const translation = makeBrandTranslation({
      brand: {
        id: "brand-1",
        name: "Nike",
        logo: "https://example.com/logo.png",
      },
      language: { id: "en", code: "EN", name: "English" },
    });
    mocks.brandTranslationRepository.findUniqueBrandTranslation.mockResolvedValue(
      translation,
    );

    // Act
    const result = await service.getBrandTranslationById(BRAND_TRANSLATION_ID);

    // Assert
    expect(result.brand).toBeDefined();
    expect(result.brand?.name).toBe("Nike");
    expect(result.language).toBeDefined();
    expect(result.language.name).toBe("English");
  });
});

describe("BrandTranslationService - getBrandTranslations", () => {
  let service: BrandTranslationService;
  let mocks: BrandTranslationServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupBrandTranslationService());
  });

  it("falls back to page 1, size 10, ascending by createdAt when nothing is supplied", async () => {
    // Arrange
    const translations = [makeBrandTranslation()];
    mocks.brandTranslationRepository.findManyBrandTranslations.mockResolvedValue(
      {
        brandTranslations: translations,
        brandTranslationsCount: 3,
      },
    );

    // Act
    const result = await service.getBrandTranslations({});

    // Assert
    expect(result).toEqual({
      data: translations,
      pagination: {
        page: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 3,
      },
    });
    expect(
      mocks.brandTranslationRepository.findManyBrandTranslations,
    ).toHaveBeenCalledWith({
      where: { name: { contains: "", mode: "insensitive" } },
      take: 10,
      skip: 0,
      orderBy: { [ORDER_BY.CREATED_AT]: ORDER.ASC },
    });
  });

  it("respects explicit page, size, order, and orderBy parameters", async () => {
    // Arrange
    const translations = [makeBrandTranslation()];
    mocks.brandTranslationRepository.findManyBrandTranslations.mockResolvedValue(
      {
        brandTranslations: translations,
        brandTranslationsCount: 2,
      },
    );

    // Act
    const result = await service.getBrandTranslations({
      page: 2,
      pageSize: 5,
      order: ORDER.DESC,
      orderBy: ORDER_BY.UPDATED_AT,
    });

    // Assert
    expect(result).toEqual({
      data: translations,
      pagination: {
        page: 2,
        pageSize: 5,
        totalPages: 1,
        totalItems: 2,
      },
    });
    expect(
      mocks.brandTranslationRepository.findManyBrandTranslations,
    ).toHaveBeenCalledWith({
      where: { name: { contains: "", mode: "insensitive" } },
      take: 5,
      skip: 5,
      orderBy: { [ORDER_BY.UPDATED_AT]: ORDER.DESC },
    });
  });

  it("filters by keyword case-insensitively", async () => {
    // Arrange
    const translations = [
      makeBrandTranslation({ name: "Nike English Translation" }),
    ];
    mocks.brandTranslationRepository.findManyBrandTranslations.mockResolvedValue(
      {
        brandTranslations: translations,
        brandTranslationsCount: 1,
      },
    );

    // Act
    await service.getBrandTranslations({ keyword: "NIKE" });

    // Assert
    expect(
      mocks.brandTranslationRepository.findManyBrandTranslations,
    ).toHaveBeenCalledWith({
      where: { name: { contains: "NIKE", mode: "insensitive" } },
      take: 10,
      skip: 0,
      orderBy: { [ORDER_BY.CREATED_AT]: ORDER.ASC },
    });
  });

  it("calculates correct total pages and handles pagination offset", async () => {
    // Arrange
    mocks.brandTranslationRepository.findManyBrandTranslations.mockResolvedValue(
      {
        brandTranslations: [],
        brandTranslationsCount: 25,
      },
    );

    // Act
    const result = await service.getBrandTranslations({
      page: 3,
      pageSize: 10,
    });

    // Assert
    expect(result.pagination.totalPages).toBe(3);
    expect(
      mocks.brandTranslationRepository.findManyBrandTranslations,
    ).toHaveBeenCalledWith({
      where: { name: { contains: "", mode: "insensitive" } },
      skip: 20,
      take: 10,
      orderBy: { createdAt: "asc" },
    });
  });

  it("normalizes order to lowercase for Prisma compatibility", async () => {
    // Arrange
    mocks.brandTranslationRepository.findManyBrandTranslations.mockResolvedValue(
      {
        brandTranslations: [],
        brandTranslationsCount: 0,
      },
    );

    // Act
    await service.getBrandTranslations({ order: ORDER.DESC });

    // Assert
    expect(
      mocks.brandTranslationRepository.findManyBrandTranslations,
    ).toHaveBeenCalledWith({
      where: { name: { contains: "", mode: "insensitive" } },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });
  });

  it("handles empty result set", async () => {
    // Arrange
    mocks.brandTranslationRepository.findManyBrandTranslations.mockResolvedValue(
      {
        brandTranslations: [],
        brandTranslationsCount: 0,
      },
    );

    // Act
    const result = await service.getBrandTranslations({});

    // Assert
    expect(result.data).toEqual([]);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.totalItems).toBe(0);
  });

  it("returns empty keyword when none is provided", async () => {
    // Arrange
    mocks.brandTranslationRepository.findManyBrandTranslations.mockResolvedValue(
      {
        brandTranslations: [],
        brandTranslationsCount: 0,
      },
    );

    // Act
    await service.getBrandTranslations({});

    // Assert
    expect(
      mocks.brandTranslationRepository.findManyBrandTranslations,
    ).toHaveBeenCalledWith(
      containing({
        where: { name: { contains: "", mode: "insensitive" } },
      }),
    );
  });
});
