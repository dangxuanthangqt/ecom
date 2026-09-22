import { BrandTranslationController } from "../brand-translation.controller";

import {
  ACTIVE_USER_ID,
  BRAND_TRANSLATION_ID,
  containing,
  makeBrandTranslationResponse,
  setupBrandTranslationController,
  BrandTranslationControllerMocks,
} from "./brand-translation-controller-test-harness";

describe("BrandTranslationController - getBrandTranslations", () => {
  let controller: BrandTranslationController;
  let mocks: BrandTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupBrandTranslationController());
  });

  it("calls the service with query and returns wrapped result", async () => {
    // Arrange
    const brandTranslation = makeBrandTranslationResponse();
    const response = {
      data: [brandTranslation],
      pagination: {
        page: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 1,
      },
    };
    mocks.brandTranslationService.getBrandTranslations.mockResolvedValue(
      response,
    );

    const query = { page: 1, pageSize: 10 };

    // Act
    const result = await controller.getBrandTranslations(query);

    // Assert
    expect(
      mocks.brandTranslationService.getBrandTranslations,
    ).toHaveBeenCalledWith(query);
    expect(result.data).toEqual([brandTranslation]);
    expect(result.pagination).toEqual(response.pagination);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Database error");
    mocks.brandTranslationService.getBrandTranslations.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.getBrandTranslations({ page: 1, pageSize: 10 }),
    ).rejects.toBe(error);
  });
});

describe("BrandTranslationController - getBrandTranslationById", () => {
  let controller: BrandTranslationController;
  let mocks: BrandTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupBrandTranslationController());
  });

  it("calls the service with id and returns wrapped result", async () => {
    // Arrange
    const brandTranslation = makeBrandTranslationResponse();
    mocks.brandTranslationService.getBrandTranslationById.mockResolvedValue(
      brandTranslation,
    );

    // Act
    const result =
      await controller.getBrandTranslationById(BRAND_TRANSLATION_ID);

    // Assert
    expect(
      mocks.brandTranslationService.getBrandTranslationById,
    ).toHaveBeenCalledWith(BRAND_TRANSLATION_ID);
    expect(result).toEqual(brandTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Not found");
    mocks.brandTranslationService.getBrandTranslationById.mockRejectedValue(
      error,
    );

    // Act & Assert
    await expect(
      controller.getBrandTranslationById(BRAND_TRANSLATION_ID),
    ).rejects.toBe(error);
  });
});

describe("BrandTranslationController - createBrandTranslation", () => {
  let controller: BrandTranslationController;
  let mocks: BrandTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupBrandTranslationController());
  });

  it("calls the service with data and userId and returns wrapped result", async () => {
    // Arrange
    const brandTranslation = makeBrandTranslationResponse();
    mocks.brandTranslationService.createBrandTranslation.mockResolvedValue(
      brandTranslation,
    );

    const data = {
      brandId: "33333333-3333-4333-8333-333333333333",
      languageId: "44444444-4444-4444-8444-444444444444",
      name: "Brand Name",
      description: "Description",
    };

    // Act
    const result = await controller.createBrandTranslation(
      ACTIVE_USER_ID,
      data,
    );

    // Assert
    expect(
      mocks.brandTranslationService.createBrandTranslation,
    ).toHaveBeenCalledWith(
      containing({
        data,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(brandTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Validation failed");
    mocks.brandTranslationService.createBrandTranslation.mockRejectedValue(
      error,
    );

    const data = {
      brandId: "some-id",
      languageId: "some-lang",
      name: "Test",
      description: "Test description",
    };

    // Act & Assert
    await expect(
      controller.createBrandTranslation(ACTIVE_USER_ID, data),
    ).rejects.toBe(error);
  });
});

describe("BrandTranslationController - updateBrandTranslation", () => {
  let controller: BrandTranslationController;
  let mocks: BrandTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupBrandTranslationController());
  });

  it("calls the service with id, data, and userId and returns wrapped result", async () => {
    // Arrange
    const brandTranslation = makeBrandTranslationResponse();
    mocks.brandTranslationService.updateBrandTranslation.mockResolvedValue(
      brandTranslation,
    );

    const data = { name: "Updated Name" };

    // Act
    const result = await controller.updateBrandTranslation(
      BRAND_TRANSLATION_ID,
      ACTIVE_USER_ID,
      data,
    );

    // Assert
    expect(
      mocks.brandTranslationService.updateBrandTranslation,
    ).toHaveBeenCalledWith(
      containing({
        id: BRAND_TRANSLATION_ID,
        data,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(brandTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Not found");
    mocks.brandTranslationService.updateBrandTranslation.mockRejectedValue(
      error,
    );

    const data = { name: "Updated" };

    // Act & Assert
    await expect(
      controller.updateBrandTranslation(
        BRAND_TRANSLATION_ID,
        ACTIVE_USER_ID,
        data,
      ),
    ).rejects.toBe(error);
  });
});

describe("BrandTranslationController - deleteBrandTranslation", () => {
  let controller: BrandTranslationController;
  let mocks: BrandTranslationControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupBrandTranslationController());
  });

  it("calls the service with id and userId and returns wrapped result", async () => {
    // Arrange
    const brandTranslation = makeBrandTranslationResponse({
      deletedAt: new Date(),
    });
    mocks.brandTranslationService.deleteBrandTranslation.mockResolvedValue(
      brandTranslation,
    );

    // Act
    const result = await controller.deleteBrandTranslation(
      BRAND_TRANSLATION_ID,
      ACTIVE_USER_ID,
    );

    // Assert
    expect(
      mocks.brandTranslationService.deleteBrandTranslation,
    ).toHaveBeenCalledWith(
      containing({
        id: BRAND_TRANSLATION_ID,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(brandTranslation);
  });

  it("propagates service errors", async () => {
    // Arrange
    const error = new Error("Not found");
    mocks.brandTranslationService.deleteBrandTranslation.mockRejectedValue(
      error,
    );

    // Act & Assert
    await expect(
      controller.deleteBrandTranslation(BRAND_TRANSLATION_ID, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});
