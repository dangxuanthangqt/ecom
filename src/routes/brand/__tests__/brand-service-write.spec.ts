import {
  CreateBrandRequestDto,
  UpdateBrandRequestDto,
} from "@/dtos/brand/brand.dto";

import { BrandService } from "../brand.service";

import {
  BRAND_ID,
  CREATED_BY_USER_ID,
  UPDATED_BY_USER_ID,
  containing,
  makeBrand,
  setupBrandService,
  BrandServiceMocks,
} from "./brand-service-test-harness";

/** Typed accessor for updateBrand mock calls. */
const updateBrandCallArgOf = (mocks: BrandServiceMocks, callIndex = 0) => {
  const mockedFn = jest.mocked(mocks.brandRepository.updateBrand);
  const calls = mockedFn.mock.calls as unknown[][];
  return calls[callIndex]?.[0] as {
    data?: unknown;
    brandTranslationIds?: unknown;
  };
};

describe("BrandService - createBrand", () => {
  let service: BrandService;
  let mocks: BrandServiceMocks;

  const makeCreateBody = (overrides: Partial<CreateBrandRequestDto> = {}) =>
    ({
      name: "New Brand",
      logo: "https://example.com/new-logo.png",
      ...overrides,
    }) as CreateBrandRequestDto;

  beforeEach(async () => {
    ({ service, mocks } = await setupBrandService());
    mocks.brandRepository.createBrand.mockResolvedValue(makeBrand());
  });

  it("creates a brand with the provided data and stamps the creator", async () => {
    // Arrange
    const body = makeCreateBody({
      name: "Nike",
      logo: "https://example.com/nike-logo.png",
    });

    // Act
    await service.createBrand({ body, userId: CREATED_BY_USER_ID });

    // Assert
    expect(mocks.brandRepository.createBrand).toHaveBeenCalledWith({
      data: {
        name: "Nike",
        logo: "https://example.com/nike-logo.png",
        createdById: CREATED_BY_USER_ID,
      },
      brandTranslationIds: undefined,
    });
  });

  it("connects brand translations when provided", async () => {
    // Arrange
    const translationIds = ["trans-1", "trans-2"];
    const body = makeCreateBody({ brandTranslationIds: translationIds });

    // Act
    await service.createBrand({ body, userId: CREATED_BY_USER_ID });

    // Assert
    expect(mocks.brandRepository.createBrand).toHaveBeenCalledWith({
      data: containing({ createdById: CREATED_BY_USER_ID }),
      brandTranslationIds: translationIds,
    });
  });

  it("ignores brand translation IDs when not provided", async () => {
    // Arrange
    const body = makeCreateBody();

    // Act
    await service.createBrand({ body, userId: CREATED_BY_USER_ID });

    // Assert
    expect(mocks.brandRepository.createBrand).toHaveBeenCalledWith(
      containing({ brandTranslationIds: undefined }),
    );
  });

  it("returns the created brand from the repository", async () => {
    // Arrange
    const created = makeBrand({ name: "Created Brand" });
    mocks.brandRepository.createBrand.mockResolvedValue(created);

    // Act
    const result = await service.createBrand({
      body: makeCreateBody(),
      userId: CREATED_BY_USER_ID,
    });

    // Assert
    expect(result).toBe(created);
  });

  it("propagates repository errors", async () => {
    // Arrange
    const error = new Error("Duplicate brand name");
    mocks.brandRepository.createBrand.mockRejectedValue(error);

    // Act
    const promise = service.createBrand({
      body: makeCreateBody(),
      userId: CREATED_BY_USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});

describe("BrandService - updateBrand", () => {
  let service: BrandService;
  let mocks: BrandServiceMocks;

  const makeUpdateBody = (overrides: Partial<UpdateBrandRequestDto> = {}) =>
    ({
      name: "Updated Brand",
      logo: "https://example.com/updated-logo.png",
      ...overrides,
    }) as UpdateBrandRequestDto;

  beforeEach(async () => {
    ({ service, mocks } = await setupBrandService());
    mocks.brandRepository.updateBrand.mockResolvedValue(makeBrand());
  });

  it("updates a brand with the provided data and stamps the updater", async () => {
    // Arrange
    const body = makeUpdateBody({
      name: "Updated Nike",
      logo: "https://example.com/updated.png",
    });

    // Act
    await service.updateBrand({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
      body,
    });

    // Assert
    expect(mocks.brandRepository.updateBrand).toHaveBeenCalledWith({
      id: BRAND_ID,
      data: {
        name: "Updated Nike",
        logo: "https://example.com/updated.png",
        updatedById: UPDATED_BY_USER_ID,
      },
      brandTranslationIds: undefined,
    });
  });

  it("separates brandTranslationIds from other update data", async () => {
    // Arrange
    const body = makeUpdateBody({
      name: "New Name",
      brandTranslationIds: ["trans-1"],
    });

    // Act
    await service.updateBrand({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
      body,
    });

    // Assert
    const call = updateBrandCallArgOf(mocks);
    expect(call.data).not.toHaveProperty("brandTranslationIds");
    expect(call.brandTranslationIds).toEqual(["trans-1"]);
  });

  it("allows partial updates (only name)", async () => {
    // Arrange
    const body = { name: "New Name" } as UpdateBrandRequestDto;

    // Act
    await service.updateBrand({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
      body,
    });

    // Assert
    expect(mocks.brandRepository.updateBrand).toHaveBeenCalledWith({
      id: BRAND_ID,
      data: containing({ name: "New Name" }),
      brandTranslationIds: undefined,
    });
  });

  it("allows partial updates (only logo)", async () => {
    // Arrange
    const body = {
      logo: "https://example.com/new.png",
    } as UpdateBrandRequestDto;

    // Act
    await service.updateBrand({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
      body,
    });

    // Assert
    expect(mocks.brandRepository.updateBrand).toHaveBeenCalledWith({
      id: BRAND_ID,
      data: containing({ logo: "https://example.com/new.png" }),
      brandTranslationIds: undefined,
    });
  });

  it("returns the updated brand from the repository", async () => {
    // Arrange
    const updated = makeBrand({ name: "Updated" });
    mocks.brandRepository.updateBrand.mockResolvedValue(updated);

    // Act
    const result = await service.updateBrand({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
      body: makeUpdateBody(),
    });

    // Assert
    expect(result).toBe(updated);
  });

  it("propagates not-found error from the repository", async () => {
    // Arrange
    const error = new Error("Brand not found");
    mocks.brandRepository.updateBrand.mockRejectedValue(error);

    // Act
    const promise = service.updateBrand({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
      body: makeUpdateBody(),
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});

describe("BrandService - deleteBrand", () => {
  let service: BrandService;
  let mocks: BrandServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupBrandService());
    mocks.brandRepository.deleteBrand.mockResolvedValue({
      message: "Brand deleted successfully.",
    });
  });

  it("soft-deletes a brand by default", async () => {
    // Arrange
    // Act
    await service.deleteBrand({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    expect(mocks.brandRepository.deleteBrand).toHaveBeenCalledWith({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
      isHardDelete: false,
    });
  });

  it("hard-deletes a brand when requested", async () => {
    // Arrange
    // Act
    await service.deleteBrand({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
      isHardDelete: true,
    });

    // Assert
    expect(mocks.brandRepository.deleteBrand).toHaveBeenCalledWith({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
      isHardDelete: true,
    });
  });

  it("stamps the deleter on the deletion", async () => {
    // Arrange
    const deleterUserId = "deleter-user-id";

    // Act
    await service.deleteBrand({
      id: BRAND_ID,
      userId: deleterUserId,
    });

    // Assert
    expect(mocks.brandRepository.deleteBrand).toHaveBeenCalledWith({
      id: BRAND_ID,
      userId: deleterUserId,
      isHardDelete: false,
    });
  });

  it("returns the deletion result from the repository", async () => {
    // Arrange
    const result = { message: "Brand deleted successfully." };
    mocks.brandRepository.deleteBrand.mockResolvedValue(result);

    // Act
    const response = await service.deleteBrand({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    expect(response).toBe(result);
  });

  it("propagates not-found error from the repository", async () => {
    // Arrange
    const error = new Error("Brand not found");
    mocks.brandRepository.deleteBrand.mockRejectedValue(error);

    // Act
    const promise = service.deleteBrand({
      id: BRAND_ID,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});
