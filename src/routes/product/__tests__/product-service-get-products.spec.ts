import { ORDER, ORDER_BY } from "@/constants/order";
import { ProductOrderByFields } from "@/dtos/product/constant";
import {
  ProductPaginationQueryDto,
  ProductResponseDto,
} from "@/dtos/product/product.dto";

import { ProductService } from "../product.service";

import {
  BRAND_ID,
  CATEGORY_ID,
  containing,
  LANGUAGE_ID,
  makeProduct,
  ProductServiceMocks,
  setupProductService,
} from "./product-service-test-harness";

describe("ProductService - getProducts", () => {
  let service: ProductService;
  let mocks: ProductServiceMocks;

  const makeQuery = (
    overrides: Partial<ProductPaginationQueryDto> = {},
  ): ProductPaginationQueryDto => ({
    pageIndex: 1,
    pageSize: 10,
    order: ORDER.ASC,
    orderBy: ORDER_BY.CREATED_AT,
    ...overrides,
  });

  beforeEach(async () => {
    ({ service, mocks } = await setupProductService());
  });

  it("fetches products with default pagination and ordering", async () => {
    // Arrange
    const products = [
      makeProduct(),
      makeProduct({ id: "prod-2", name: "Another" }),
    ];
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products,
      productsCount: 2,
    });

    // Act
    const result = await service.getProducts({
      query: makeQuery(),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({ isPublic: true }),
        skip: 0,
        take: 10,
        orderBy: { [ORDER_BY.CREATED_AT]: ORDER.ASC },
      }),
      LANGUAGE_ID,
    );
    expect(result.data).toEqual(products);
    expect(result.pagination.pageIndex).toBe(1);
    expect(result.pagination.pageSize).toBe(10);
    expect(result.pagination.totalItems).toBe(2);
    expect(result.pagination.totalPages).toBe(1);
  });

  it("respects custom pageIndex and pageSize", async () => {
    // Arrange
    const products = [makeProduct()];
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products,
      productsCount: 50,
    });

    // Act
    await service.getProducts({
      query: makeQuery({ pageIndex: 3, pageSize: 20 }),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        skip: 40, // (3 - 1) * 20
        take: 20,
      }),
      LANGUAGE_ID,
    );
  });

  it("calculates totalPages correctly", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [makeProduct()],
      productsCount: 25,
    });

    // Act
    const result = await service.getProducts({
      query: makeQuery({ pageSize: 10 }),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(result.pagination.totalPages).toBe(3); // Math.ceil(25 / 10)
  });

  it("applies name filter", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    await service.getProducts({
      query: makeQuery({ name: "iPhone" }),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({ name: "iPhone", isPublic: true }),
      }),
      LANGUAGE_ID,
    );
  });

  it("applies brand filter", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    await service.getProducts({
      query: makeQuery({ brandIds: [BRAND_ID] }),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({ brandIds: [BRAND_ID], isPublic: true }),
      }),
      LANGUAGE_ID,
    );
  });

  it("applies category filter", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    await service.getProducts({
      query: makeQuery({ categoryIds: [CATEGORY_ID] }),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({ categoryIds: [CATEGORY_ID], isPublic: true }),
      }),
      LANGUAGE_ID,
    );
  });

  it("applies price range filters", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    await service.getProducts({
      query: makeQuery({ minPrice: 50, maxPrice: 200 }),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({
          minPrice: 50,
          maxPrice: 200,
          isPublic: true,
        }),
      }),
      LANGUAGE_ID,
    );
  });

  it("respects DESC ordering", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    await service.getProducts({
      query: makeQuery({ order: ORDER.DESC }),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        orderBy: { [ORDER_BY.CREATED_AT]: ORDER.DESC },
      }),
      LANGUAGE_ID,
    );
  });

  it("composes complex orderBy for SALE field", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    await service.getProducts({
      query: makeQuery({
        orderBy: ProductOrderByFields.SALE,
        order: ORDER.DESC,
      }),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        orderBy: {
          orders: {
            _count: ORDER.DESC,
          },
        },
      }),
      LANGUAGE_ID,
    );
  });

  it("passes languageId to the repository", async () => {
    // Arrange
    const customLanguageId = "lang-vi-vn";
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    await service.getProducts({
      query: makeQuery(),
      languageId: customLanguageId,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      expect.any(Object),
      customLanguageId,
    );
  });

  it("returns empty data when no products match", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    const result = await service.getProducts({
      query: makeQuery(),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(result.data).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it("wraps every row in ProductResponseDto so the serializer can strip extra fields", async () => {
    // Arrange — ClassSerializerInterceptor (excludeExtraneousValues: true) only
    // applies @Expose() rules to actual DTO instances, not plain Prisma rows;
    // returning a raw row here would leak unexposed fields over the wire.
    const products = [makeProduct(), makeProduct({ id: "prod-2" })];
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products,
      productsCount: 2,
    });

    // Act
    const result = await service.getProducts({
      query: makeQuery(),
      languageId: LANGUAGE_ID,
    });

    // Assert
    result.data.forEach((item) => {
      expect(item).toBeInstanceOf(ProductResponseDto);
    });
  });

  it("ensures isPublic filter is always applied", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    await service.getProducts({
      query: makeQuery({
        name: "test",
        brandIds: [BRAND_ID],
      }),
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({ isPublic: true }),
      }),
      LANGUAGE_ID,
    );
  });
});
