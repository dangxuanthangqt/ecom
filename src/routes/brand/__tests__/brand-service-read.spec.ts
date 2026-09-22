import { NotFoundException } from "@nestjs/common";

import { ORDER, ORDER_BY } from "@/constants/order";

import { BrandService } from "../brand.service";

import {
  BRAND_ID,
  LANGUAGE_ID,
  containing,
  makeBrand,
  setupBrandService,
  BrandServiceMocks,
} from "./brand-service-test-harness";

describe("BrandService - getBrands", () => {
  let service: BrandService;
  let mocks: BrandServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupBrandService());
  });

  it("falls back to page 1, size 10, ascending by createdAt when nothing is supplied", async () => {
    // Arrange
    const brands = [makeBrand()];
    mocks.brandRepository.findManyBrands.mockResolvedValue({
      brands,
      brandsCount: 3,
    });

    // Act
    const result = await service.getBrands({}, LANGUAGE_ID);

    // Assert
    expect(result).toEqual({
      data: brands,
      pagination: {
        page: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 3,
      },
    });
    expect(mocks.brandRepository.findManyBrands).toHaveBeenCalledWith(
      containing({
        where: { name: { contains: "", mode: "insensitive" } },
        take: 10,
        skip: 0,
        orderBy: { [ORDER_BY.CREATED_AT]: ORDER.ASC },
      }),
      LANGUAGE_ID,
    );
  });

  it("respects explicit page, size, order, and orderBy parameters", async () => {
    // Arrange
    const brands = [
      makeBrand({ name: "Brand B" }),
      makeBrand({ name: "Brand A" }),
    ];
    mocks.brandRepository.findManyBrands.mockResolvedValue({
      brands,
      brandsCount: 2,
    });

    // Act
    const result = await service.getBrands(
      {
        page: 2,
        pageSize: 5,
        order: ORDER.DESC,
        orderBy: ORDER_BY.UPDATED_AT,
      },
      LANGUAGE_ID,
    );

    // Assert
    expect(result).toEqual({
      data: brands,
      pagination: {
        page: 2,
        pageSize: 5,
        totalPages: 1,
        totalItems: 2,
      },
    });
    expect(mocks.brandRepository.findManyBrands).toHaveBeenCalledWith(
      containing({
        where: { name: { contains: "", mode: "insensitive" } },
        take: 5,
        skip: 5,
        orderBy: { [ORDER_BY.UPDATED_AT]: ORDER.DESC },
      }),
      LANGUAGE_ID,
    );
  });

  it("filters by keyword case-insensitively", async () => {
    // Arrange
    const brands = [makeBrand({ name: "Apple Inc" })];
    mocks.brandRepository.findManyBrands.mockResolvedValue({
      brands,
      brandsCount: 1,
    });

    // Act
    await service.getBrands({ keyword: "APPLE" }, LANGUAGE_ID);

    // Assert
    expect(mocks.brandRepository.findManyBrands).toHaveBeenCalledWith(
      containing({
        where: {
          name: { contains: "APPLE", mode: "insensitive" },
        },
      }),
      LANGUAGE_ID,
    );
  });

  it("calculates correct total pages and handles pagination offset", async () => {
    // Arrange
    mocks.brandRepository.findManyBrands.mockResolvedValue({
      brands: [],
      brandsCount: 25,
    });

    // Act
    const result = await service.getBrands(
      { page: 3, pageSize: 10 },
      LANGUAGE_ID,
    );

    // Assert
    expect(result.pagination.totalPages).toBe(3);
    expect(mocks.brandRepository.findManyBrands).toHaveBeenCalledWith(
      containing({ skip: 20, take: 10 }),
      LANGUAGE_ID,
    );
  });

  it("normalizes order to lowercase for Prisma compatibility", async () => {
    // Arrange
    mocks.brandRepository.findManyBrands.mockResolvedValue({
      brands: [],
      brandsCount: 0,
    });

    // Act
    await service.getBrands({ order: ORDER.ASC }, LANGUAGE_ID);

    // Assert
    expect(mocks.brandRepository.findManyBrands).toHaveBeenCalledWith(
      containing({ orderBy: { createdAt: "asc" } }),
      LANGUAGE_ID,
    );
  });

  it("handles empty result set", async () => {
    // Arrange
    mocks.brandRepository.findManyBrands.mockResolvedValue({
      brands: [],
      brandsCount: 0,
    });

    // Act
    const result = await service.getBrands({}, LANGUAGE_ID);

    // Assert
    expect(result.data).toEqual([]);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.totalItems).toBe(0);
  });

  it("passes the language ID to the repository", async () => {
    // Arrange
    const languageId = "custom-lang-id";
    mocks.brandRepository.findManyBrands.mockResolvedValue({
      brands: [],
      brandsCount: 0,
    });

    // Act
    await service.getBrands({}, languageId);

    // Assert
    expect(mocks.brandRepository.findManyBrands).toHaveBeenCalledWith(
      expect.any(Object),
      languageId,
    );
  });
});

describe("BrandService - getBrandById", () => {
  let service: BrandService;
  let mocks: BrandServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupBrandService());
  });

  it("returns the brand with the specified ID and language", async () => {
    // Arrange
    const brand = makeBrand({ name: "Nike" });
    mocks.brandRepository.findUniqueBrand.mockResolvedValue(brand);

    // Act
    const result = await service.getBrandById({
      brandId: BRAND_ID,
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(result).toBe(brand);
    expect(mocks.brandRepository.findUniqueBrand).toHaveBeenCalledWith({
      brandId: BRAND_ID,
      languageId: LANGUAGE_ID,
    });
  });

  it("propagates not-found error from the repository", async () => {
    // Arrange
    const notFound = new NotFoundException({ message: "Brand not found." });
    mocks.brandRepository.findUniqueBrand.mockRejectedValue(notFound);

    // Act
    const promise = service.getBrandById({
      brandId: BRAND_ID,
      languageId: LANGUAGE_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(notFound);
  });

  it("includes brand translations in the result", async () => {
    // Arrange
    const brand = makeBrand({
      brandTranslations: [
        {
          id: "trans-1",
          name: "Nike EN",
          description: "Nike English",
          language: { id: "en", code: "EN", name: "English" },
        },
      ],
    });
    mocks.brandRepository.findUniqueBrand.mockResolvedValue(brand);

    // Act
    const result = await service.getBrandById({
      brandId: BRAND_ID,
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(result.brandTranslations).toHaveLength(1);
    expect(result.brandTranslations[0].name).toBe("Nike EN");
  });
});
