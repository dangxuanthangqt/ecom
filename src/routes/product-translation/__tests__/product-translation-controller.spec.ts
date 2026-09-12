import { ProductTranslationController } from "../product-translation.controller";

import {
  ACTIVE_USER_ID,
  PRODUCT_TRANSLATION_ID,
  containing,
  makeProductTranslationResponse,
  setupProductTranslationController,
  ProductTranslationControllerMocks,
} from "./product-translation-controller-test-harness";

describe("ProductTranslationController - getProductTranslations", () => {
  let controller: ProductTranslationController;
  let mocks: ProductTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupProductTranslationController());
  });

  it("calls the service with query and returns wrapped result", async () => {
    // Arrange
    const productTranslation = makeProductTranslationResponse();
    const response = {
      data: [productTranslation],
      pagination: {
        pageIndex: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 1,
      },
    };
    mocks.productTranslationService.getProductTranslations.mockResolvedValue(
      response,
    );

    const query = { pageIndex: 1, pageSize: 10 };

    // Act
    const result = await controller.getProductTranslations(query);

    // Assert
    expect(
      mocks.productTranslationService.getProductTranslations,
    ).toHaveBeenCalledWith(query);
    expect(result.data).toEqual([productTranslation]);
    expect(result.pagination).toEqual(response.pagination);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Database error");
    mocks.productTranslationService.getProductTranslations.mockRejectedValue(
      error,
    );

    // Act & Assert
    await expect(
      controller.getProductTranslations({ pageIndex: 1, pageSize: 10 }),
    ).rejects.toBe(error);
  });
});

describe("ProductTranslationController - getProductTranslationById", () => {
  let controller: ProductTranslationController;
  let mocks: ProductTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupProductTranslationController());
  });

  it("calls the service with id and returns wrapped result", async () => {
    // Arrange
    const productTranslation = makeProductTranslationResponse();
    mocks.productTranslationService.getProductTranslationById.mockResolvedValue(
      productTranslation,
    );

    // Act
    const result = await controller.getProductTranslationById(
      PRODUCT_TRANSLATION_ID,
    );

    // Assert
    expect(
      mocks.productTranslationService.getProductTranslationById,
    ).toHaveBeenCalledWith(PRODUCT_TRANSLATION_ID);
    expect(result).toEqual(productTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Not found");
    mocks.productTranslationService.getProductTranslationById.mockRejectedValue(
      error,
    );

    // Act & Assert
    await expect(
      controller.getProductTranslationById(PRODUCT_TRANSLATION_ID),
    ).rejects.toBe(error);
  });
});

describe("ProductTranslationController - createProductTranslation", () => {
  let controller: ProductTranslationController;
  let mocks: ProductTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupProductTranslationController());
  });

  it("calls the service with userId and body and returns wrapped result", async () => {
    // Arrange
    const productTranslation = makeProductTranslationResponse();
    mocks.productTranslationService.createProductTranslation.mockResolvedValue(
      productTranslation,
    );

    const body = {
      productId: "33333333-3333-4333-8333-333333333333",
      languageId: "44444444-4444-4444-8444-444444444444",
      name: "Product Name",
      description: "Description",
    };

    // Act
    const result = await controller.createProductTranslation(
      ACTIVE_USER_ID,
      body,
    );

    // Assert
    expect(
      mocks.productTranslationService.createProductTranslation,
    ).toHaveBeenCalledWith(
      containing({
        data: body,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(productTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Validation failed");
    mocks.productTranslationService.createProductTranslation.mockRejectedValue(
      error,
    );

    const body = {
      productId: "some-id",
      languageId: "some-lang",
      name: "Test",
      description: "Test description",
    };

    // Act & Assert
    await expect(
      controller.createProductTranslation(ACTIVE_USER_ID, body),
    ).rejects.toBe(error);
  });
});

describe("ProductTranslationController - updateProductTranslation", () => {
  let controller: ProductTranslationController;
  let mocks: ProductTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupProductTranslationController());
  });

  it("calls the service with id, userId, and body and returns wrapped result", async () => {
    // Arrange
    const productTranslation = makeProductTranslationResponse();
    mocks.productTranslationService.updateProductTranslation.mockResolvedValue(
      productTranslation,
    );

    const body = { name: "Updated Name" };

    // Act
    const result = await controller.updateProductTranslation(
      PRODUCT_TRANSLATION_ID,
      ACTIVE_USER_ID,
      body,
    );

    // Assert
    expect(
      mocks.productTranslationService.updateProductTranslation,
    ).toHaveBeenCalledWith(
      containing({
        id: PRODUCT_TRANSLATION_ID,
        data: body,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(productTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Not found");
    mocks.productTranslationService.updateProductTranslation.mockRejectedValue(
      error,
    );

    const body = { name: "Updated" };

    // Act & Assert
    await expect(
      controller.updateProductTranslation(
        PRODUCT_TRANSLATION_ID,
        ACTIVE_USER_ID,
        body,
      ),
    ).rejects.toBe(error);
  });
});

describe("ProductTranslationController - deleteProductTranslation", () => {
  let controller: ProductTranslationController;
  let mocks: ProductTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupProductTranslationController());
  });

  it("calls the service with id and userId and returns wrapped result", async () => {
    // Arrange
    const productTranslation = makeProductTranslationResponse({
      deletedAt: new Date(),
    });
    mocks.productTranslationService.deleteProductTranslation.mockResolvedValue(
      productTranslation,
    );

    // Act
    const result = await controller.deleteProductTranslation(
      PRODUCT_TRANSLATION_ID,
      ACTIVE_USER_ID,
    );

    // Assert
    expect(
      mocks.productTranslationService.deleteProductTranslation,
    ).toHaveBeenCalledWith(
      containing({
        id: PRODUCT_TRANSLATION_ID,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(productTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Not found");
    mocks.productTranslationService.deleteProductTranslation.mockRejectedValue(
      error,
    );

    // Act & Assert
    await expect(
      controller.deleteProductTranslation(
        PRODUCT_TRANSLATION_ID,
        ACTIVE_USER_ID,
      ),
    ).rejects.toBe(error);
  });
});
