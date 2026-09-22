import { ManageProductController } from "../manage-product.controller";

import {
  ACTIVE_USER_ID,
  ADMIN_SCOPE,
  LANGUAGE_ID,
  PRODUCT_ID,
  SELLER_SCOPE,
  containing,
  makeProductResponse,
  setupManageProductController,
  ManageProductControllerMocks,
} from "./manage-product-controller-test-harness";

describe("ManageProductController - getManageProducts", () => {
  let controller: ManageProductController;
  let mocks: ManageProductControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupManageProductController());
  });

  it("calls the service with query, languageId, userId, and scope and returns wrapped result", async () => {
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
    mocks.manageProductService.getProducts.mockResolvedValue(response);

    const query = { pageIndex: 1, pageSize: 10 };

    // Act
    const result = await controller.getManageProducts(
      query,
      LANGUAGE_ID,
      ACTIVE_USER_ID,
      SELLER_SCOPE,
    );

    // Assert
    expect(mocks.manageProductService.getProducts).toHaveBeenCalledWith(
      containing({
        query,
        languageId: LANGUAGE_ID,
        userId: ACTIVE_USER_ID,
        scope: SELLER_SCOPE,
      }),
    );
    expect(result.data).toEqual([product]);
    expect(result.pagination).toEqual(response.pagination);
  });

  it("passes admin role name to the service", async () => {
    // Arrange
    mocks.manageProductService.getProducts.mockResolvedValue({
      data: [makeProductResponse()],
      pagination: {
        pageIndex: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 1,
      },
    });

    const query = { pageIndex: 1, pageSize: 10 };

    // Act
    await controller.getManageProducts(
      query,
      LANGUAGE_ID,
      ACTIVE_USER_ID,
      ADMIN_SCOPE,
    );

    // Assert
    expect(mocks.manageProductService.getProducts).toHaveBeenCalledWith(
      containing({
        scope: ADMIN_SCOPE,
      }),
    );
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Access denied");
    mocks.manageProductService.getProducts.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.getManageProducts(
        { pageIndex: 1, pageSize: 10 },
        LANGUAGE_ID,
        ACTIVE_USER_ID,
        SELLER_SCOPE,
      ),
    ).rejects.toBe(error);
  });
});

describe("ManageProductController - getManageProductById", () => {
  let controller: ManageProductController;
  let mocks: ManageProductControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupManageProductController());
  });

  it("calls the service with productId, languageId, userId, and scope and returns wrapped result", async () => {
    // Arrange
    const product = makeProductResponse();
    mocks.manageProductService.getProductById.mockResolvedValue(product);

    // Act
    const result = await controller.getManageProductById(
      PRODUCT_ID,
      LANGUAGE_ID,
      ACTIVE_USER_ID,
      SELLER_SCOPE,
    );

    // Assert
    expect(mocks.manageProductService.getProductById).toHaveBeenCalledWith(
      containing({
        productId: PRODUCT_ID,
        languageId: LANGUAGE_ID,
        userId: ACTIVE_USER_ID,
        scope: SELLER_SCOPE,
      }),
    );
    expect(result).toEqual(product);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Product not found");
    mocks.manageProductService.getProductById.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.getManageProductById(
        PRODUCT_ID,
        LANGUAGE_ID,
        ACTIVE_USER_ID,
        SELLER_SCOPE,
      ),
    ).rejects.toBe(error);
  });
});

describe("ManageProductController - createProduct", () => {
  let controller: ManageProductController;
  let mocks: ManageProductControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupManageProductController());
  });

  it("calls the service with data and userId and returns wrapped result", async () => {
    // Arrange
    const product = makeProductResponse();
    mocks.manageProductService.createProduct.mockResolvedValue(product);

    const data = {
      name: "New Product",
      basePrice: 100,
      virtualPrice: 90,
      images: ["https://example.com/image.jpg"],
      brandId: "44444444-4444-4444-8444-444444444444",
      categoryIds: ["55555555-5555-5555-8555-555555555555"],
      variants: [{ value: "Color", options: ["Red", "Blue"] }],
      skus: [
        {
          value: "SKU-RED",
          price: 100,
          stock: 10,
          image: "https://example.com/image-red.jpg",
        },
      ],
    };

    // Act
    const result = await controller.createProduct(data, ACTIVE_USER_ID);

    // Assert
    expect(mocks.manageProductService.createProduct).toHaveBeenCalledWith(
      containing({
        data,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(product);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Validation failed");
    mocks.manageProductService.createProduct.mockRejectedValue(error);

    const data = {
      name: "Test",
      basePrice: 100,
      virtualPrice: 90,
      images: ["https://example.com/image.jpg"],
      brandId: "44444444-4444-4444-8444-444444444444",
      categoryIds: ["55555555-5555-5555-8555-555555555555"],
      variants: [{ value: "Color", options: ["Red"] }],
      skus: [
        {
          value: "SKU-TEST",
          price: 100,
          stock: 10,
          image: "https://example.com/image.jpg",
        },
      ],
    };

    // Act & Assert
    await expect(controller.createProduct(data, ACTIVE_USER_ID)).rejects.toBe(
      error,
    );
  });
});

describe("ManageProductController - updateProduct", () => {
  let controller: ManageProductController;
  let mocks: ManageProductControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupManageProductController());
  });

  it("calls the service with productId, data, userId, and scope and returns wrapped result", async () => {
    // Arrange
    const product = makeProductResponse();
    mocks.manageProductService.updateProduct.mockResolvedValue(product);

    const data = {
      name: "Updated Product",
      variants: [{ value: "Color", options: ["Red"] }],
      skus: [
        {
          value: "SKU-UPDATED",
          price: 100,
          stock: 10,
          image: "https://example.com/image-updated.jpg",
        },
      ],
    };

    // Act
    const result = await controller.updateProduct(
      data,
      PRODUCT_ID,
      ACTIVE_USER_ID,
      SELLER_SCOPE,
    );

    // Assert
    expect(mocks.manageProductService.updateProduct).toHaveBeenCalledWith(
      containing({
        productId: PRODUCT_ID,
        data,
        userId: ACTIVE_USER_ID,
        scope: SELLER_SCOPE,
      }),
    );
    expect(result).toEqual(product);
  });

  it("passes admin role to the service", async () => {
    // Arrange
    mocks.manageProductService.updateProduct.mockResolvedValue(
      makeProductResponse(),
    );

    const data = {
      variants: [{ value: "Color", options: ["Red"] }],
      skus: [
        {
          value: "SKU-ADMIN",
          price: 100,
          stock: 10,
          image: "https://example.com/image-admin.jpg",
        },
      ],
    };

    // Act
    await controller.updateProduct(
      data,
      PRODUCT_ID,
      ACTIVE_USER_ID,
      ADMIN_SCOPE,
    );

    // Assert
    expect(mocks.manageProductService.updateProduct).toHaveBeenCalledWith(
      containing({
        scope: ADMIN_SCOPE,
      }),
    );
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Product not found");
    mocks.manageProductService.updateProduct.mockRejectedValue(error);

    const data = {
      variants: [{ value: "Color", options: ["Red"] }],
      skus: [
        {
          value: "SKU-ERROR",
          price: 100,
          stock: 10,
          image: "https://example.com/image-error.jpg",
        },
      ],
    };

    // Act & Assert
    await expect(
      controller.updateProduct(data, PRODUCT_ID, ACTIVE_USER_ID, SELLER_SCOPE),
    ).rejects.toBe(error);
  });
});

describe("ManageProductController - deleteProduct", () => {
  let controller: ManageProductController;
  let mocks: ManageProductControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupManageProductController());
  });

  it("calls the service with productId, userId, and scope and returns wrapped result", async () => {
    // Arrange
    const product = makeProductResponse({ deletedAt: new Date() });
    mocks.manageProductService.deleteProduct.mockResolvedValue(product);

    // Act
    const result = await controller.deleteProduct(
      PRODUCT_ID,
      ACTIVE_USER_ID,
      SELLER_SCOPE,
    );

    // Assert
    expect(mocks.manageProductService.deleteProduct).toHaveBeenCalledWith(
      containing({
        productId: PRODUCT_ID,
        userId: ACTIVE_USER_ID,
        scope: SELLER_SCOPE,
      }),
    );
    expect(result).toEqual(product);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Access denied");
    mocks.manageProductService.deleteProduct.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.deleteProduct(PRODUCT_ID, ACTIVE_USER_ID, SELLER_SCOPE),
    ).rejects.toBe(error);
  });
});
