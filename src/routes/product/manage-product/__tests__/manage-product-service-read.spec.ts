import { ORDER, ORDER_BY } from "@/constants/order";
import { Scope } from "@/constants/permission.constant";
import {
  ManageProductPaginationQueryDto,
  ProductResponseDto,
} from "@/dtos/product/product.dto";

import { ManageProductService } from "../manage-product.service";

import {
  ADMIN_USER_ID,
  containing,
  CREATOR_USER_ID,
  expectForbiddenPermission,
  LANGUAGE_ID,
  makeProduct,
  ManageProductServiceMocks,
  PRODUCT_ID,
  SELLER_USER_ID,
  setupManageProductService,
} from "./manage-product-service-test-harness";

/** Shape of the argument passed to findUniqueProduct, for typed assertions. */
interface FindUniqueProductCall {
  where?: Record<string, unknown>;
  select?: unknown;
}

/** Typed accessor for calls to findUniqueProduct mock. */
const findUniqueProductCallArgOf = (
  mocks: ManageProductServiceMocks,
  callIndex = 0,
): FindUniqueProductCall => {
  const mockedFn = jest.mocked(mocks.productRepository.findUniqueProduct);
  const calls = mockedFn.mock.calls as unknown[][];
  return calls[callIndex]?.[0] as FindUniqueProductCall;
};

describe("ManageProductService - getProducts", () => {
  let service: ManageProductService;
  let mocks: ManageProductServiceMocks;

  const makeQuery = (
    overrides: Partial<ManageProductPaginationQueryDto> = {},
  ): ManageProductPaginationQueryDto => ({
    page: 1,
    pageSize: 10,
    order: ORDER.ASC,
    orderBy: ORDER_BY.CREATED_AT,
    ...overrides,
  });

  beforeEach(async () => {
    ({ service, mocks } = await setupManageProductService());
  });

  it("lets an admin fetch all products", async () => {
    // Arrange
    const products = [makeProduct()];
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products,
      productsCount: 1,
    });

    // Act
    const result = await service.getProducts({
      query: makeQuery(),
      languageId: LANGUAGE_ID,
      userId: ADMIN_USER_ID,
      scope: Scope.ANY,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({
          createdById: ADMIN_USER_ID, // Defaults to their own id
        }),
      }),
      LANGUAGE_ID,
    );
    expect(result.data).toEqual(products);
  });

  it("wraps every row in ProductResponseDto so the serializer can strip extra fields", async () => {
    // Arrange
    const products = [makeProduct(), makeProduct({ id: "prod-2" })];
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products,
      productsCount: 2,
    });

    // Act
    const result = await service.getProducts({
      query: makeQuery(),
      languageId: LANGUAGE_ID,
      userId: ADMIN_USER_ID,
      scope: Scope.ANY,
    });

    // Assert
    result.data.forEach((item) => {
      expect(item).toBeInstanceOf(ProductResponseDto);
    });
  });

  it("lets a seller fetch only their own products by default", async () => {
    // Arrange
    const products = [makeProduct({ createdById: SELLER_USER_ID })];
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products,
      productsCount: 1,
    });

    // Act
    await service.getProducts({
      query: makeQuery(),
      languageId: LANGUAGE_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({
          createdById: SELLER_USER_ID,
        }),
      }),
      LANGUAGE_ID,
    );
  });

  it("allows admin to fetch products created by another user", async () => {
    // Arrange
    const products = [makeProduct({ createdById: SELLER_USER_ID })];
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products,
      productsCount: 1,
    });

    // Act
    await service.getProducts({
      query: makeQuery({ createdById: SELLER_USER_ID }),
      languageId: LANGUAGE_ID,
      userId: ADMIN_USER_ID,
      scope: Scope.ANY,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({
          createdById: SELLER_USER_ID,
        }),
      }),
      LANGUAGE_ID,
    );
  });

  it("forbids a seller from fetching products created by another user", async () => {
    // Act
    const promise = service.getProducts({
      query: makeQuery({ createdById: CREATOR_USER_ID }),
      languageId: LANGUAGE_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    await expectForbiddenPermission(promise);
    expect(mocks.productRepository.findManyProducts).not.toHaveBeenCalled();
  });

  it("normalizes order case to lowercase", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    await service.getProducts({
      query: makeQuery({ order: ORDER.ASC }),
      languageId: LANGUAGE_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        orderBy: { [ORDER_BY.CREATED_AT]: "asc" },
      }),
      LANGUAGE_ID,
    );
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
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({ name: "iPhone" }),
      }),
      LANGUAGE_ID,
    );
  });

  it("applies isPublic filter when provided", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 0,
    });

    // Act
    await service.getProducts({
      query: makeQuery({ isPublic: true }),
      languageId: LANGUAGE_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        query: containing({ isPublic: true }),
      }),
      LANGUAGE_ID,
    );
  });

  it("respects custom pagination parameters", async () => {
    // Arrange
    mocks.productRepository.findManyProducts.mockResolvedValue({
      products: [],
      productsCount: 100,
    });

    // Act
    const result = await service.getProducts({
      query: makeQuery({ page: 5, pageSize: 25 }),
      languageId: LANGUAGE_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(mocks.productRepository.findManyProducts).toHaveBeenCalledWith(
      containing({
        skip: 100, // (5 - 1) * 25
        take: 25,
      }),
      LANGUAGE_ID,
    );
    expect(result.pagination.totalPages).toBe(4); // Math.ceil(100 / 25)
  });
});

describe("ManageProductService - getProductById", () => {
  let service: ManageProductService;
  let mocks: ManageProductServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupManageProductService());
  });

  it("lets a user fetch their own product", async () => {
    // Arrange
    const product = makeProduct({ createdById: SELLER_USER_ID });
    mocks.productRepository.findUniqueProduct.mockResolvedValue(product);

    // Act
    const result = await service.getProductById({
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(mocks.productRepository.findUniqueProduct).toHaveBeenCalledWith(
      containing({
        where: containing({
          id: PRODUCT_ID,
          deletedAt: null,
        }),
      }),
    );
    expect(result).toEqual(product);
  });

  it("lets an admin fetch any product", async () => {
    // Arrange
    const product = makeProduct({ createdById: SELLER_USER_ID });
    mocks.productRepository.findUniqueProduct.mockResolvedValue(product);

    // Act
    await service.getProductById({
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
      userId: ADMIN_USER_ID,
      scope: Scope.ANY,
    });

    // Assert
    expect(mocks.productRepository.findUniqueProduct).toHaveBeenCalled();
  });

  it("forbids a seller from fetching another user's product", async () => {
    // Arrange
    mocks.productRepository.findUniqueProduct.mockResolvedValue(
      makeProduct({ createdById: CREATOR_USER_ID }),
    );

    // Act
    const promise = service.getProductById({
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    await expectForbiddenPermission(promise);
  });

  it("answers 404 for an id that does not resolve to a product", async () => {
    // Arrange
    mocks.productRepository.findUniqueProduct.mockResolvedValue(null);

    // Act
    const promise = service.getProductById({
      productId: "non-existent",
      languageId: LANGUAGE_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert - a missing product is a 404, never a dereference of null
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Product not found." },
    });
  });

  it("passes languageId to repository", async () => {
    // Arrange
    const customLanguageId = "lang-es-es";
    mocks.productRepository.findUniqueProduct.mockResolvedValue(
      makeProduct({ createdById: SELLER_USER_ID }),
    );

    // Act
    await service.getProductById({
      productId: PRODUCT_ID,
      languageId: customLanguageId,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    const callArg = findUniqueProductCallArgOf(mocks);
    expect(callArg).toEqual(
      containing({
        select: containing({
          productTranslations: containing({
            where: containing({ languageId: customLanguageId }),
          }),
        }),
      }),
    );
  });

  it("includes createdById in the select", async () => {
    // Arrange
    const product = makeProduct({ createdById: SELLER_USER_ID });
    mocks.productRepository.findUniqueProduct.mockResolvedValue(product);

    // Act
    await service.getProductById({
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    const callArg = findUniqueProductCallArgOf(mocks);
    expect(callArg.select).toHaveProperty("createdById", true);
  });
});
