import { ProductService } from "../product.service";

import {
  containing,
  LANGUAGE_ID,
  makeProduct,
  PRODUCT_ID,
  ProductServiceMocks,
  setupProductService,
} from "./product-service-test-harness";

/** Shape of the argument passed to findUniqueProduct, for typed assertions. */
interface FindUniqueProductCall {
  where: { id: string; deletedAt: null; publishedAt?: unknown };
  select?: unknown;
}

/** Typed accessor for calls to findUniqueProduct mock. */
const callArgOf = (
  mocks: ProductServiceMocks,
  callIndex = 0,
): FindUniqueProductCall => {
  const mockedFn = jest.mocked(mocks.productRepository.findUniqueProduct);
  const calls = mockedFn.mock.calls as unknown[][];
  return calls[callIndex]?.[0] as FindUniqueProductCall;
};

describe("ProductService - getProductById", () => {
  let service: ProductService;
  let mocks: ProductServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupProductService());
  });

  it("fetches a published product by id", async () => {
    // Arrange
    const product = makeProduct();
    mocks.productRepository.findUniqueProduct.mockResolvedValue(product);

    // Act
    const result = await service.getProductById({
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findUniqueProduct).toHaveBeenCalledWith(
      containing({
        where: containing({
          id: PRODUCT_ID,
          deletedAt: null,
          publishedAt: containing({}), // Has lte and not checks
        }),
      }),
    );
    expect(result).toBe(product);
  });

  it("excludes deleted products", async () => {
    // Arrange
    mocks.productRepository.findUniqueProduct.mockResolvedValue(null);

    // Act
    await service.getProductById({
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(mocks.productRepository.findUniqueProduct).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
      }),
    );
  });

  it("only returns products with publishedAt in the past or present", async () => {
    // Arrange
    mocks.productRepository.findUniqueProduct.mockResolvedValue(null);

    // Act
    await service.getProductById({
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
    });

    // Assert
    const callArg = callArgOf(mocks);
    const publishedAtCondition = callArg.where.publishedAt;
    expect(publishedAtCondition).toHaveProperty("lte");
    expect(publishedAtCondition).toHaveProperty("not", null);
  });

  it("returns null when product not found", async () => {
    // Arrange
    mocks.productRepository.findUniqueProduct.mockResolvedValue(null);

    // Act
    const result = await service.getProductById({
      productId: "non-existent-id",
      languageId: LANGUAGE_ID,
    });

    // Assert
    expect(result).toBeNull();
  });

  it("passes languageId to repository", async () => {
    // Arrange
    const customLanguageId = "lang-fr-fr";
    mocks.productRepository.findUniqueProduct.mockResolvedValue(makeProduct());

    // Act
    await service.getProductById({
      productId: PRODUCT_ID,
      languageId: customLanguageId,
    });

    // Assert
    const callArg = callArgOf(mocks);
    expect(callArg.select).toBeDefined();
    // Verify that the select includes productTranslations with the custom languageId
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

  it("propagates repository errors", async () => {
    // Arrange
    const error = new Error("Database connection failed");
    mocks.productRepository.findUniqueProduct.mockRejectedValue(error);

    // Act
    const promise = service.getProductById({
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("excludes unpublished future products", async () => {
    // Arrange
    mocks.productRepository.findUniqueProduct.mockResolvedValue(null);

    // Act
    await service.getProductById({
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
    });

    // Assert
    const callArg = callArgOf(mocks);
    expect(callArg.where.publishedAt).toHaveProperty("not", null);
  });
});
