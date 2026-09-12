import { ORDER, ORDER_BY } from "@/constants/order";
import {
  CreateProductTranslationRequestDto,
  UpdateProductTranslationRequestDto,
} from "@/dtos/product-translation/product-translation.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";

import { ProductTranslationService } from "../product-translation.service";

import {
  containing,
  LANGUAGE_ID,
  makeProductTranslation,
  PRODUCT_ID,
  ProductTranslationServiceMocks,
  setupProductTranslationService,
  stubProductValidation,
  TRANSLATION_ID,
  USER_ID,
} from "./product-translation-service-test-harness";

describe("ProductTranslationService - getProductTranslations", () => {
  let service: ProductTranslationService;
  let mocks: ProductTranslationServiceMocks;

  const makeQuery = (
    overrides: Partial<PaginationQueryDto> = {},
  ): PaginationQueryDto => ({
    pageIndex: 1,
    pageSize: 10,
    order: ORDER.ASC,
    orderBy: ORDER_BY.CREATED_AT,
    keyword: "",
    ...overrides,
  });

  beforeEach(async () => {
    ({ service, mocks } = await setupProductTranslationService());
  });

  it("fetches product translations with default pagination", async () => {
    // Arrange
    const translations = [makeProductTranslation()];
    mocks.productTranslationRepository.findManyProductTranslations.mockResolvedValue(
      {
        productTranslations: translations,
        productTranslationsCount: 1,
      },
    );

    // Act
    const result = await service.getProductTranslations(makeQuery());

    // Assert
    expect(
      mocks.productTranslationRepository.findManyProductTranslations,
    ).toHaveBeenCalledWith(
      containing({
        skip: 0,
        take: 10,
        orderBy: { [ORDER_BY.CREATED_AT]: "asc" },
        where: containing({
          name: containing({
            contains: "",
            mode: "insensitive",
          }),
        }),
      }),
    );
    expect(result.data).toEqual(translations);
    expect(result.pagination.pageIndex).toBe(1);
    expect(result.pagination.pageSize).toBe(10);
    expect(result.pagination.totalItems).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
  });

  it("respects custom pagination parameters", async () => {
    // Arrange
    const productTranslations = [makeProductTranslation()];
    mocks.productTranslationRepository.findManyProductTranslations.mockResolvedValue(
      {
        productTranslations,
        productTranslationsCount: 100,
      },
    );

    // Act
    const result = await service.getProductTranslations(
      makeQuery({ pageIndex: 4, pageSize: 20 }),
    );

    // Assert
    expect(
      mocks.productTranslationRepository.findManyProductTranslations,
    ).toHaveBeenCalledWith(
      containing({
        skip: 60, // (4 - 1) * 20
        take: 20,
      }),
    );
    expect(result.pagination.totalPages).toBe(5); // Math.ceil(100 / 20)
  });

  it("normalizes order case to lowercase", async () => {
    // Arrange
    mocks.productTranslationRepository.findManyProductTranslations.mockResolvedValue(
      {
        productTranslations: [],
        productTranslationsCount: 0,
      },
    );

    // Act
    await service.getProductTranslations(makeQuery({ order: ORDER.DESC }));

    // Assert
    expect(
      mocks.productTranslationRepository.findManyProductTranslations,
    ).toHaveBeenCalledWith(
      containing({
        orderBy: { [ORDER_BY.CREATED_AT]: "desc" },
      }),
    );
  });

  it("applies keyword search filter with case-insensitive mode", async () => {
    // Arrange
    mocks.productTranslationRepository.findManyProductTranslations.mockResolvedValue(
      {
        productTranslations: [],
        productTranslationsCount: 0,
      },
    );

    // Act
    await service.getProductTranslations(makeQuery({ keyword: "iPhone" }));

    // Assert
    expect(
      mocks.productTranslationRepository.findManyProductTranslations,
    ).toHaveBeenCalledWith(
      containing({
        where: containing({
          name: containing({
            contains: "iPhone",
            mode: "insensitive",
          }),
        }),
      }),
    );
  });

  it("calculates totalPages correctly", async () => {
    // Arrange
    mocks.productTranslationRepository.findManyProductTranslations.mockResolvedValue(
      {
        productTranslations: [],
        productTranslationsCount: 47,
      },
    );

    // Act
    const result = await service.getProductTranslations(
      makeQuery({ pageSize: 15 }),
    );

    // Assert
    expect(result.pagination.totalPages).toBe(4); // Math.ceil(47 / 15)
  });

  it("returns empty data when no translations found", async () => {
    // Arrange
    mocks.productTranslationRepository.findManyProductTranslations.mockResolvedValue(
      {
        productTranslations: [],
        productTranslationsCount: 0,
      },
    );

    // Act
    const result = await service.getProductTranslations(makeQuery());

    // Assert
    expect(result.data).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });
});

describe("ProductTranslationService - createProductTranslation", () => {
  let service: ProductTranslationService;
  let mocks: ProductTranslationServiceMocks;

  const makeCreateBody = (
    overrides: Partial<CreateProductTranslationRequestDto> = {},
  ): CreateProductTranslationRequestDto =>
    ({
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
      name: "Product Name",
      description: "Product Description",
      ...overrides,
    }) as CreateProductTranslationRequestDto;

  beforeEach(async () => {
    ({ service, mocks } = await setupProductTranslationService());
    stubProductValidation(mocks);
    mocks.productTranslationRepository.createProductTranslation.mockResolvedValue(
      makeProductTranslation(),
    );
  });

  it("validates the product before creating", async () => {
    // Arrange
    const body = makeCreateBody();

    // Act
    await service.createProductTranslation({
      data: body,
      userId: USER_ID,
    });

    // Assert
    expect(
      mocks.productTranslationRepository.validateProduct,
    ).toHaveBeenCalledWith(PRODUCT_ID);
  });

  it("creates translation with correct structure", async () => {
    // Arrange
    const body = makeCreateBody({
      name: "iPhone 15 Pro",
      description: "Latest iPhone",
    });

    // Act
    await service.createProductTranslation({
      data: body,
      userId: USER_ID,
    });

    // Assert
    expect(
      mocks.productTranslationRepository.createProductTranslation,
    ).toHaveBeenCalledWith(
      containing({
        data: containing({
          productId: PRODUCT_ID,
          languageId: LANGUAGE_ID,
          name: "iPhone 15 Pro",
          description: "Latest iPhone",
          createdById: USER_ID,
        }),
      }),
    );
  });

  it("stamps the creator user id", async () => {
    // Arrange
    const customUserId = "custom-user-123";
    const body = makeCreateBody();

    // Act
    await service.createProductTranslation({
      data: body,
      userId: customUserId,
    });

    // Assert
    expect(
      mocks.productTranslationRepository.createProductTranslation,
    ).toHaveBeenCalledWith(
      containing({
        data: containing({
          createdById: customUserId,
        }),
      }),
    );
  });

  it("returns the created translation unchanged", async () => {
    // Arrange
    const created = makeProductTranslation({ name: "Created Translation" });
    mocks.productTranslationRepository.createProductTranslation.mockResolvedValue(
      created,
    );

    // Act
    const result = await service.createProductTranslation({
      data: makeCreateBody(),
      userId: USER_ID,
    });

    // Assert
    expect(result).toBe(created);
  });

  it("propagates product validation errors", async () => {
    // Arrange
    const validationError = new Error("Product not found");
    mocks.productTranslationRepository.validateProduct.mockRejectedValue(
      validationError,
    );

    // Act
    const promise = service.createProductTranslation({
      data: makeCreateBody(),
      userId: USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(validationError);
    expect(
      mocks.productTranslationRepository.createProductTranslation,
    ).not.toHaveBeenCalled();
  });

  it("awaits the product validation", async () => {
    // Arrange
    const body = makeCreateBody();

    // Act
    await service.createProductTranslation({
      data: body,
      userId: USER_ID,
    });

    // Assert
    const calls =
      mocks.productTranslationRepository.validateProduct.mock.results;
    expect(calls.length).toBe(1);
    expect(calls[0].type).toBe("return");
  });
});

describe("ProductTranslationService - getProductTranslationById", () => {
  let service: ProductTranslationService;
  let mocks: ProductTranslationServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupProductTranslationService());
  });

  it("fetches translation by id", async () => {
    // Arrange
    const translation = makeProductTranslation();
    mocks.productTranslationRepository.findProductTranslationById.mockResolvedValue(
      translation,
    );

    // Act
    const result = await service.getProductTranslationById(TRANSLATION_ID);

    // Assert
    expect(
      mocks.productTranslationRepository.findProductTranslationById,
    ).toHaveBeenCalledWith(TRANSLATION_ID);
    expect(result).toBe(translation);
  });

  it("returns null when translation not found", async () => {
    // Arrange
    mocks.productTranslationRepository.findProductTranslationById.mockResolvedValue(
      null,
    );

    // Act
    const result = await service.getProductTranslationById("non-existent-id");

    // Assert
    expect(result).toBeNull();
  });

  it("propagates repository errors", async () => {
    // Arrange
    const error = new Error("Database error");
    mocks.productTranslationRepository.findProductTranslationById.mockRejectedValue(
      error,
    );

    // Act
    const promise = service.getProductTranslationById(TRANSLATION_ID);

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});

describe("ProductTranslationService - updateProductTranslation", () => {
  let service: ProductTranslationService;
  let mocks: ProductTranslationServiceMocks;

  const makeUpdateBody = (
    overrides: Partial<UpdateProductTranslationRequestDto> = {},
  ): UpdateProductTranslationRequestDto =>
    ({
      name: "Updated Name",
      ...overrides,
    }) as UpdateProductTranslationRequestDto;

  beforeEach(async () => {
    ({ service, mocks } = await setupProductTranslationService());
    stubProductValidation(mocks);
    mocks.productTranslationRepository.updateProductTranslation.mockResolvedValue(
      makeProductTranslation(),
    );
  });

  it("validates product when productId is provided", async () => {
    // Arrange
    const newProductId = "new-product-id";
    const body = makeUpdateBody({ productId: newProductId });

    // Act
    await service.updateProductTranslation({
      id: TRANSLATION_ID,
      data: body,
      userId: USER_ID,
    });

    // Assert
    expect(
      mocks.productTranslationRepository.validateProduct,
    ).toHaveBeenCalledWith(newProductId);
  });

  it("skips product validation when productId is not provided", async () => {
    // Arrange
    const body = makeUpdateBody();
    delete body.productId;

    // Act
    await service.updateProductTranslation({
      id: TRANSLATION_ID,
      data: body,
      userId: USER_ID,
    });

    // Assert
    expect(
      mocks.productTranslationRepository.validateProduct,
    ).not.toHaveBeenCalled();
  });

  it("updates translation with updatedById", async () => {
    // Arrange
    const body = makeUpdateBody({ name: "New Name" });
    const customUserId = "new-user-id";

    // Act
    await service.updateProductTranslation({
      id: TRANSLATION_ID,
      data: body,
      userId: customUserId,
    });

    // Assert
    expect(
      mocks.productTranslationRepository.updateProductTranslation,
    ).toHaveBeenCalledWith(
      containing({
        id: TRANSLATION_ID,
        data: containing({
          name: "New Name",
          updatedById: customUserId,
        }),
      }),
    );
  });

  it("returns the updated translation unchanged", async () => {
    // Arrange
    const updated = makeProductTranslation({ name: "Updated" });
    mocks.productTranslationRepository.updateProductTranslation.mockResolvedValue(
      updated,
    );

    // Act
    const result = await service.updateProductTranslation({
      id: TRANSLATION_ID,
      data: makeUpdateBody(),
      userId: USER_ID,
    });

    // Assert
    expect(result).toBe(updated);
  });

  it("propagates validation errors", async () => {
    // Arrange
    const validationError = new Error("Invalid product");
    mocks.productTranslationRepository.validateProduct.mockRejectedValue(
      validationError,
    );

    // Act
    const promise = service.updateProductTranslation({
      id: TRANSLATION_ID,
      data: makeUpdateBody({ productId: "bad-id" }),
      userId: USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(validationError);
    expect(
      mocks.productTranslationRepository.updateProductTranslation,
    ).not.toHaveBeenCalled();
  });
});

describe("ProductTranslationService - deleteProductTranslation", () => {
  let service: ProductTranslationService;
  let mocks: ProductTranslationServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupProductTranslationService());
    mocks.productTranslationRepository.deleteProductTranslation.mockResolvedValue(
      { id: TRANSLATION_ID },
    );
  });

  it("deletes translation with user context", async () => {
    // Arrange & Act
    await service.deleteProductTranslation({
      id: TRANSLATION_ID,
      userId: USER_ID,
    });

    // Assert
    expect(
      mocks.productTranslationRepository.deleteProductTranslation,
    ).toHaveBeenCalledWith(
      containing({
        id: TRANSLATION_ID,
        userId: USER_ID,
      }),
    );
  });

  it("returns the deletion result unchanged", async () => {
    // Arrange
    const deletionResult = { id: TRANSLATION_ID, deletedAt: new Date() };
    mocks.productTranslationRepository.deleteProductTranslation.mockResolvedValue(
      deletionResult,
    );

    // Act
    const result = await service.deleteProductTranslation({
      id: TRANSLATION_ID,
      userId: USER_ID,
    });

    // Assert
    expect(result).toBe(deletionResult);
  });

  it("propagates repository errors", async () => {
    // Arrange
    const error = new Error("Deletion failed");
    mocks.productTranslationRepository.deleteProductTranslation.mockRejectedValue(
      error,
    );

    // Act
    const promise = service.deleteProductTranslation({
      id: TRANSLATION_ID,
      userId: USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("passes custom user id", async () => {
    // Arrange
    const customUserId = "another-user";

    // Act
    await service.deleteProductTranslation({
      id: TRANSLATION_ID,
      userId: customUserId,
    });

    // Assert
    expect(
      mocks.productTranslationRepository.deleteProductTranslation,
    ).toHaveBeenCalledWith(
      containing({
        userId: customUserId,
      }),
    );
  });
});
