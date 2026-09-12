import {
  BrandTranslationRequestDto,
  UpdateBrandTranslationRequestDto,
} from "@/dtos/brand-translation/brand-translation.dto";

import { BrandTranslationService } from "../brand-translation.service";

import {
  BRAND_ID,
  BRAND_TRANSLATION_ID,
  CREATED_BY_USER_ID,
  LANGUAGE_ID,
  UPDATED_BY_USER_ID,
  containing,
  makeBrandTranslation,
  setupBrandTranslationService,
  BrandTranslationServiceMocks,
} from "./brand-translation-service-test-harness";

describe("BrandTranslationService - createBrandTranslation", () => {
  let service: BrandTranslationService;
  let mocks: BrandTranslationServiceMocks;

  const makeCreateData = (
    overrides: Partial<BrandTranslationRequestDto> = {},
  ) =>
    ({
      name: "Nike English",
      description: "Nike brand in English",
      languageId: LANGUAGE_ID,
      brandId: BRAND_ID,
      ...overrides,
    }) as BrandTranslationRequestDto;

  beforeEach(async () => {
    ({ service, mocks } = await setupBrandTranslationService());
    mocks.brandTranslationRepository.validateBrand.mockResolvedValue({
      id: BRAND_ID,
    });
    mocks.brandTranslationRepository.createBrandTranslation.mockResolvedValue(
      makeBrandTranslation(),
    );
  });

  it("validates the brand exists before creating the translation", async () => {
    // Arrange
    const data = makeCreateData();

    // Act
    await service.createBrandTranslation({
      data,
      userId: CREATED_BY_USER_ID,
    });

    // Assert
    expect(mocks.brandTranslationRepository.validateBrand).toHaveBeenCalledWith(
      BRAND_ID,
    );
  });

  it("creates a brand translation with the provided data and stamps the creator", async () => {
    // Arrange
    const data = makeCreateData({
      name: "Nike Vietnamese",
      description: "Nike brand in Vietnamese",
      languageId: "vi",
    });

    // Act
    await service.createBrandTranslation({
      data,
      userId: CREATED_BY_USER_ID,
    });

    // Assert
    expect(
      mocks.brandTranslationRepository.createBrandTranslation,
    ).toHaveBeenCalledWith({
      data: {
        name: "Nike Vietnamese",
        description: "Nike brand in Vietnamese",
        languageId: "vi",
        brandId: BRAND_ID,
        createdById: CREATED_BY_USER_ID,
      },
    });
  });

  it("returns the created brand translation from the repository", async () => {
    // Arrange
    const created = makeBrandTranslation({ name: "Created Translation" });
    mocks.brandTranslationRepository.createBrandTranslation.mockResolvedValue(
      created,
    );

    // Act
    const result = await service.createBrandTranslation({
      data: makeCreateData(),
      userId: CREATED_BY_USER_ID,
    });

    // Assert
    expect(result).toBe(created);
  });

  it("propagates brand validation error from the repository", async () => {
    // Arrange
    const error = new Error("Brand not found");
    mocks.brandTranslationRepository.validateBrand.mockRejectedValue(error);

    // Act
    const promise = service.createBrandTranslation({
      data: makeCreateData(),
      userId: CREATED_BY_USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
    expect(
      mocks.brandTranslationRepository.createBrandTranslation,
    ).not.toHaveBeenCalled();
  });

  it("propagates creation error from the repository", async () => {
    // Arrange
    const error = new Error("Duplicate translation");
    mocks.brandTranslationRepository.createBrandTranslation.mockRejectedValue(
      error,
    );

    // Act
    const promise = service.createBrandTranslation({
      data: makeCreateData(),
      userId: CREATED_BY_USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});

describe("BrandTranslationService - updateBrandTranslation", () => {
  let service: BrandTranslationService;
  let mocks: BrandTranslationServiceMocks;

  const makeUpdateData = (
    overrides: Partial<UpdateBrandTranslationRequestDto> = {},
  ) =>
    ({
      name: "Updated Nike",
      description: "Updated description",
      languageId: LANGUAGE_ID,
      brandId: BRAND_ID,
      ...overrides,
    }) as UpdateBrandTranslationRequestDto;

  beforeEach(async () => {
    ({ service, mocks } = await setupBrandTranslationService());
    mocks.brandTranslationRepository.validateBrand.mockResolvedValue({
      id: BRAND_ID,
    });
    mocks.brandTranslationRepository.updateBrandTranslation.mockResolvedValue(
      makeBrandTranslation(),
    );
  });

  it("validates the brand exists before updating the translation when brandId is provided", async () => {
    // Arrange
    const data = makeUpdateData({ brandId: "new-brand-id" });

    // Act
    await service.updateBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      data,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    expect(mocks.brandTranslationRepository.validateBrand).toHaveBeenCalledWith(
      "new-brand-id",
    );
  });

  it("skips brand validation when brandId is not provided", async () => {
    // Arrange
    const data = makeUpdateData();
    delete data.brandId;

    // Act
    await service.updateBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      data,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    expect(
      mocks.brandTranslationRepository.validateBrand,
    ).not.toHaveBeenCalled();
  });

  it("updates a brand translation with the provided data and stamps the updater", async () => {
    // Arrange
    const data = makeUpdateData({
      name: "Updated Nike EN",
      description: "Updated Nike description",
    });

    // Act
    await service.updateBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      data,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    expect(
      mocks.brandTranslationRepository.updateBrandTranslation,
    ).toHaveBeenCalledWith({
      id: BRAND_TRANSLATION_ID,
      data: {
        name: "Updated Nike EN",
        description: "Updated Nike description",
        languageId: LANGUAGE_ID,
        brandId: BRAND_ID,
        updatedById: UPDATED_BY_USER_ID,
      },
    });
  });

  it("allows partial updates (only name)", async () => {
    // Arrange
    const data = { name: "New Name" } as UpdateBrandTranslationRequestDto;

    // Act
    await service.updateBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      data,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    expect(
      mocks.brandTranslationRepository.updateBrandTranslation,
    ).toHaveBeenCalledWith({
      id: BRAND_TRANSLATION_ID,
      data: containing({ name: "New Name" }),
    });
  });

  it("allows partial updates (only description)", async () => {
    // Arrange
    const data = {
      description: "New description",
    } as UpdateBrandTranslationRequestDto;

    // Act
    await service.updateBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      data,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    expect(
      mocks.brandTranslationRepository.updateBrandTranslation,
    ).toHaveBeenCalledWith({
      id: BRAND_TRANSLATION_ID,
      data: containing({ description: "New description" }),
    });
  });

  it("returns the updated brand translation from the repository", async () => {
    // Arrange
    const updated = makeBrandTranslation({ name: "Updated" });
    mocks.brandTranslationRepository.updateBrandTranslation.mockResolvedValue(
      updated,
    );

    // Act
    const result = await service.updateBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      data: makeUpdateData(),
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    expect(result).toBe(updated);
  });

  it("propagates brand validation error from the repository", async () => {
    // Arrange
    const error = new Error("Brand not found");
    mocks.brandTranslationRepository.validateBrand.mockRejectedValue(error);

    // Act
    const promise = service.updateBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      data: makeUpdateData({ brandId: "new-brand-id" }),
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
    expect(
      mocks.brandTranslationRepository.updateBrandTranslation,
    ).not.toHaveBeenCalled();
  });

  it("propagates update error from the repository", async () => {
    // Arrange
    const error = new Error("Translation not found");
    mocks.brandTranslationRepository.updateBrandTranslation.mockRejectedValue(
      error,
    );

    // Act
    const promise = service.updateBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      data: makeUpdateData(),
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});

describe("BrandTranslationService - deleteBrandTranslation", () => {
  let service: BrandTranslationService;
  let mocks: BrandTranslationServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupBrandTranslationService());
    mocks.brandTranslationRepository.deleteBrandTranslation.mockResolvedValue(
      makeBrandTranslation(),
    );
  });

  it("deletes a brand translation with the user ID", async () => {
    // Arrange
    // Act
    await service.deleteBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    expect(
      mocks.brandTranslationRepository.deleteBrandTranslation,
    ).toHaveBeenCalledWith({
      id: BRAND_TRANSLATION_ID,
      userId: UPDATED_BY_USER_ID,
    });
  });

  it("stamps the deleter on the deletion", async () => {
    // Arrange
    const deleterUserId = "deleter-user-id";

    // Act
    await service.deleteBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      userId: deleterUserId,
    });

    // Assert
    expect(
      mocks.brandTranslationRepository.deleteBrandTranslation,
    ).toHaveBeenCalledWith({
      id: BRAND_TRANSLATION_ID,
      userId: deleterUserId,
    });
  });

  it("returns the deleted brand translation from the repository", async () => {
    // Arrange
    const deleted = makeBrandTranslation({
      name: "Deleted Translation",
      deletedAt: new Date(),
    });
    mocks.brandTranslationRepository.deleteBrandTranslation.mockResolvedValue(
      deleted,
    );

    // Act
    const result = await service.deleteBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    expect(result).toBe(deleted);
  });

  it("propagates not-found error from the repository", async () => {
    // Arrange
    const error = new Error("Brand translation not found");
    mocks.brandTranslationRepository.deleteBrandTranslation.mockRejectedValue(
      error,
    );

    // Act
    const promise = service.deleteBrandTranslation({
      id: BRAND_TRANSLATION_ID,
      userId: UPDATED_BY_USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});
