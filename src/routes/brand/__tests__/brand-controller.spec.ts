import { BrandController } from "../brand.controller";

import {
  ACTIVE_USER_ID,
  BRAND_ID,
  LANGUAGE_ID,
  containing,
  makeBrandResponse,
  setupBrandController,
  BrandControllerMocks,
} from "./brand-controller-test-harness";

describe("BrandController - getBrands", () => {
  let controller: BrandController;
  let mocks: BrandControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupBrandController());
  });

  it("calls the service with query and languageId and returns wrapped result", async () => {
    // Arrange
    const brand = makeBrandResponse();
    const response = {
      data: [brand],
      pagination: {
        pageIndex: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 1,
      },
    };
    mocks.brandService.getBrands.mockResolvedValue(response);

    const query = { pageIndex: 1, pageSize: 10 };

    // Act
    const result = await controller.getBrands(query, LANGUAGE_ID);

    // Assert
    expect(mocks.brandService.getBrands).toHaveBeenCalledWith(
      query,
      LANGUAGE_ID,
    );
    expect(result.data).toEqual([brand]);
    expect(result.pagination).toEqual(response.pagination);
  });

  it("propagates service errors when getBrands fails", async () => {
    // Arrange
    const error = new Error("Database connection failed");
    mocks.brandService.getBrands.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getBrands({}, LANGUAGE_ID)).rejects.toBe(error);
  });
});

describe("BrandController - getBrandById", () => {
  let controller: BrandController;
  let mocks: BrandControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupBrandController());
  });

  it("calls the service with brandId and languageId and returns wrapped result", async () => {
    // Arrange
    const brand = makeBrandResponse();
    mocks.brandService.getBrandById.mockResolvedValue(brand);

    const param = { id: BRAND_ID };

    // Act
    const result = await controller.getBrandById(param, LANGUAGE_ID);

    // Assert
    expect(mocks.brandService.getBrandById).toHaveBeenCalledWith(
      containing({
        brandId: BRAND_ID,
        languageId: LANGUAGE_ID,
      }),
    );
    expect(result).toEqual(brand);
  });

  it("propagates service errors when getBrandById fails", async () => {
    // Arrange
    const error = new Error("Brand not found");
    mocks.brandService.getBrandById.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.getBrandById({ id: BRAND_ID }, LANGUAGE_ID),
    ).rejects.toBe(error);
  });
});

describe("BrandController - createBrand", () => {
  let controller: BrandController;
  let mocks: BrandControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupBrandController());
  });

  it("calls the service with body and userId and returns wrapped result", async () => {
    // Arrange
    const brand = makeBrandResponse();
    mocks.brandService.createBrand.mockResolvedValue(brand);

    const body = { name: "New Brand", logo: "https://example.com/logo.png" };

    // Act
    const result = await controller.createBrand(body, ACTIVE_USER_ID);

    // Assert
    expect(mocks.brandService.createBrand).toHaveBeenCalledWith(
      containing({
        body,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(brand);
  });

  it("propagates service errors when createBrand fails", async () => {
    // Arrange
    const error = new Error("Validation failed");
    mocks.brandService.createBrand.mockRejectedValue(error);

    const body = { name: "New Brand", logo: "https://example.com/logo.png" };

    // Act & Assert
    await expect(controller.createBrand(body, ACTIVE_USER_ID)).rejects.toBe(
      error,
    );
  });
});

describe("BrandController - updateBrand", () => {
  let controller: BrandController;
  let mocks: BrandControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupBrandController());
  });

  it("calls the service with id, body, and userId and returns wrapped result", async () => {
    // Arrange
    const brand = makeBrandResponse();
    mocks.brandService.updateBrand.mockResolvedValue(brand);

    const param = { id: BRAND_ID };
    const body = { name: "Updated Brand" };

    // Act
    const result = await controller.updateBrand(param, body, ACTIVE_USER_ID);

    // Assert
    expect(mocks.brandService.updateBrand).toHaveBeenCalledWith(
      containing({
        id: BRAND_ID,
        body,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(brand);
  });

  it("propagates service errors when updateBrand fails", async () => {
    // Arrange
    const error = new Error("Brand not found");
    mocks.brandService.updateBrand.mockRejectedValue(error);

    const param = { id: BRAND_ID };
    const body = { name: "Updated" };

    // Act & Assert
    await expect(
      controller.updateBrand(param, body, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});

describe("BrandController - deleteBrand", () => {
  let controller: BrandController;
  let mocks: BrandControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupBrandController());
  });

  it("calls the service with id, userId, and isHardDelete flag and returns wrapped result", async () => {
    // Arrange
    const brand = makeBrandResponse({ deletedAt: new Date() });
    mocks.brandService.deleteBrand.mockResolvedValue(brand);

    const param = { id: BRAND_ID };
    const body = { isHardDelete: false };

    // Act
    const result = await controller.deleteBrand(param, ACTIVE_USER_ID, body);

    // Assert
    expect(mocks.brandService.deleteBrand).toHaveBeenCalledWith(
      containing({
        id: BRAND_ID,
        userId: ACTIVE_USER_ID,
        isHardDelete: false,
      }),
    );
    expect(result).toEqual(brand);
  });

  it("defaults isHardDelete to false when body is empty", async () => {
    // Arrange
    const brand = makeBrandResponse({ deletedAt: new Date() });
    mocks.brandService.deleteBrand.mockResolvedValue(brand);

    const param = { id: BRAND_ID };
    const body = {};

    // Act
    const result = await controller.deleteBrand(param, ACTIVE_USER_ID, body);

    // Assert
    expect(mocks.brandService.deleteBrand).toHaveBeenCalledWith(
      containing({
        id: BRAND_ID,
        userId: ACTIVE_USER_ID,
        isHardDelete: false,
      }),
    );
    expect(result).toEqual(brand);
  });

  it("propagates service errors when deleteBrand fails", async () => {
    // Arrange
    const error = new Error("Brand not found");
    mocks.brandService.deleteBrand.mockRejectedValue(error);

    const param = { id: BRAND_ID };
    const body = { isHardDelete: true };

    // Act & Assert
    await expect(
      controller.deleteBrand(param, ACTIVE_USER_ID, body),
    ).rejects.toBe(error);
  });
});
