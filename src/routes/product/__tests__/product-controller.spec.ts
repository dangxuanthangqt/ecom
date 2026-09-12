import { ProductController } from "../product.controller";

import {
  LANGUAGE_ID,
  PRODUCT_ID,
  containing,
  makeProductResponse,
  setupProductController,
  ProductControllerMocks,
} from "./product-controller-test-harness";

describe("ProductController - getProducts", () => {
  let controller: ProductController;
  let mocks: ProductControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupProductController());
  });

  it("calls the service with query and languageId and returns wrapped result", async () => {
    // Arrange
    const product = makeProductResponse();
    const response = {
      data: [product],
      pagination: {
        pageIndex: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 1,
      },
    };
    mocks.productService.getProducts.mockResolvedValue(response);

    const query = { pageIndex: 1, pageSize: 10 };

    // Act
    const result = await controller.getProducts(query, LANGUAGE_ID);

    // Assert
    expect(mocks.productService.getProducts).toHaveBeenCalledWith(
      containing({
        query,
        languageId: LANGUAGE_ID,
      }),
    );
    expect(result.data).toEqual([product]);
    expect(result.pagination).toEqual(response.pagination);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Database error");
    mocks.productService.getProducts.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.getProducts({ pageIndex: 1, pageSize: 10 }, LANGUAGE_ID),
    ).rejects.toBe(error);
  });
});

describe("ProductController - getProductById", () => {
  let controller: ProductController;
  let mocks: ProductControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupProductController());
  });

  it("calls the service with productId and languageId and returns wrapped result", async () => {
    // Arrange
    const product = makeProductResponse();
    mocks.productService.getProductById.mockResolvedValue(product);

    // Act
    const result = await controller.getProductById(PRODUCT_ID, LANGUAGE_ID);

    // Assert
    expect(mocks.productService.getProductById).toHaveBeenCalledWith(
      containing({
        productId: PRODUCT_ID,
        languageId: LANGUAGE_ID,
      }),
    );
    expect(result).toEqual(product);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Product not found");
    mocks.productService.getProductById.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.getProductById(PRODUCT_ID, LANGUAGE_ID),
    ).rejects.toBe(error);
  });
});
