import { ORDER, ORDER_BY } from "@/constants/order";
import { Scope } from "@/constants/permission.constant";
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

/** The ownership fence an `own`-scoped caller is expected to carry into every query. */
const ownTranslationFence = (userId = USER_ID) => ({
  product: { createdById: userId, deletedAt: null },
});
const ownProductFence = (userId = USER_ID) => ({ createdById: userId });

const asSeller = { userId: USER_ID, scope: Scope.OWN } as const;
const asAdmin = { userId: USER_ID, scope: Scope.ANY } as const;

describe("ProductTranslationService - getProductTranslations", () => {
  let service: ProductTranslationService;
  let mocks: ProductTranslationServiceMocks;

  const makeQuery = (
    overrides: Partial<PaginationQueryDto> = {},
  ): PaginationQueryDto => ({
    page: 1,
    pageSize: 10,
    order: ORDER.ASC,
    orderBy: ORDER_BY.CREATED_AT,
    keyword: "",
    ...overrides,
  });

  const stubList = (items = [makeProductTranslation()], count = items.length) =>
    mocks.productTranslationRepository.findManyProductTranslations.mockResolvedValue(
      { productTranslations: items, productTranslationsCount: count },
    );

  beforeEach(async () => {
    ({ service, mocks } = await setupProductTranslationService());
  });

  it("fetches with default pagination", async () => {
    // Arrange
    const translations = [makeProductTranslation()];
    stubList(translations);

    // Act
    const result = await service.getProductTranslations({
      query: makeQuery(),
      ...asAdmin,
    });

    // Assert
    expect(
      mocks.productTranslationRepository.findManyProductTranslations,
    ).toHaveBeenCalledWith(
      containing({
        skip: 0,
        take: 10,
        orderBy: { createdAt: "asc" },
      }),
    );
    expect(result.data).toEqual(translations);
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalPages: 1,
      totalItems: 1,
    });
  });

  it("scopes an `own` caller to translations of products they created", async () => {
    // Arrange
    stubList([]);

    // Act
    await service.getProductTranslations({ query: makeQuery(), ...asSeller });

    // Assert — the fence is a where predicate, so other sellers' rows never
    // reach the caller rather than being filtered after the fact
    expect(
      mocks.productTranslationRepository.findManyProductTranslations,
    ).toHaveBeenCalledWith(
      containing({ where: containing(ownTranslationFence()) }),
    );
  });

  it("applies no owner fence for an `any` caller", async () => {
    // Arrange
    stubList([]);

    // Act
    await service.getProductTranslations({ query: makeQuery(), ...asAdmin });

    // Assert
    const firstCall = mocks.productTranslationRepository
      .findManyProductTranslations.mock.calls[0] as unknown as [
      { where: Record<string, unknown> },
    ];
    expect(firstCall[0].where).not.toHaveProperty("product");
  });

  it("respects custom pagination parameters", async () => {
    stubList([makeProductTranslation()], 100);

    const result = await service.getProductTranslations({
      query: makeQuery({ page: 4, pageSize: 20 }),
      ...asAdmin,
    });

    expect(
      mocks.productTranslationRepository.findManyProductTranslations,
    ).toHaveBeenCalledWith(containing({ skip: 60, take: 20 }));
    expect(result.pagination.totalPages).toBe(5);
  });

  it("normalizes order case to lowercase", async () => {
    stubList([]);

    await service.getProductTranslations({
      query: makeQuery({ order: ORDER.DESC }),
      ...asAdmin,
    });

    expect(
      mocks.productTranslationRepository.findManyProductTranslations,
    ).toHaveBeenCalledWith(containing({ orderBy: { createdAt: "desc" } }));
  });

  it("applies the keyword filter case-insensitively alongside the fence", async () => {
    stubList([]);

    await service.getProductTranslations({
      query: makeQuery({ keyword: "iPhone" }),
      ...asSeller,
    });

    expect(
      mocks.productTranslationRepository.findManyProductTranslations,
    ).toHaveBeenCalledWith(
      containing({
        where: containing({
          ...ownTranslationFence(),
          name: { contains: "iPhone", mode: "insensitive" },
        }),
      }),
    );
  });

  it("returns empty data when nothing matches", async () => {
    stubList([], 0);

    const result = await service.getProductTranslations({
      query: makeQuery(),
      ...asSeller,
    });

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

  it("requires an `own` caller to own the product being translated", async () => {
    await service.createProductTranslation({
      data: makeCreateBody(),
      ...asSeller,
    });

    expect(
      mocks.productTranslationRepository.validateProduct,
    ).toHaveBeenCalledWith(PRODUCT_ID, ownProductFence());
  });

  it("lets an `any` caller translate any existing product", async () => {
    await service.createProductTranslation({
      data: makeCreateBody(),
      ...asAdmin,
    });

    expect(
      mocks.productTranslationRepository.validateProduct,
    ).toHaveBeenCalledWith(PRODUCT_ID, {});
  });

  it("stamps the creator and passes the body through", async () => {
    const body = makeCreateBody();

    await service.createProductTranslation({ data: body, ...asSeller });

    expect(
      mocks.productTranslationRepository.createProductTranslation,
    ).toHaveBeenCalledWith({ data: { ...body, createdById: USER_ID } });
  });

  it("returns the created translation unchanged", async () => {
    const created = makeProductTranslation({ name: "Fresh" });
    mocks.productTranslationRepository.createProductTranslation.mockResolvedValue(
      created,
    );

    const result = await service.createProductTranslation({
      data: makeCreateBody(),
      ...asSeller,
    });

    expect(result).toBe(created);
  });

  it("does not create when product validation rejects (someone else's product)", async () => {
    const denied = new Error("Product with ID product-123 not found.");
    mocks.productTranslationRepository.validateProduct.mockRejectedValue(
      denied,
    );

    await expect(
      service.createProductTranslation({ data: makeCreateBody(), ...asSeller }),
    ).rejects.toBe(denied);
    expect(
      mocks.productTranslationRepository.createProductTranslation,
    ).not.toHaveBeenCalled();
  });
});

describe("ProductTranslationService - getProductTranslationById", () => {
  let service: ProductTranslationService;
  let mocks: ProductTranslationServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupProductTranslationService());
  });

  it("looks the row up inside the caller's ownership fence", async () => {
    const row = makeProductTranslation();
    mocks.productTranslationRepository.findProductTranslationById.mockResolvedValue(
      row,
    );

    const result = await service.getProductTranslationById({
      id: TRANSLATION_ID,
      ...asSeller,
    });

    expect(
      mocks.productTranslationRepository.findProductTranslationById,
    ).toHaveBeenCalledWith(TRANSLATION_ID, ownTranslationFence());
    expect(result).toBe(row);
  });

  it("applies no fence for an `any` caller", async () => {
    mocks.productTranslationRepository.findProductTranslationById.mockResolvedValue(
      makeProductTranslation(),
    );

    await service.getProductTranslationById({ id: TRANSLATION_ID, ...asAdmin });

    expect(
      mocks.productTranslationRepository.findProductTranslationById,
    ).toHaveBeenCalledWith(TRANSLATION_ID, {});
  });

  it("propagates the repository's not-found for another seller's row", async () => {
    // The repository answers 404 to a fenced miss; the service must not turn
    // that into anything that confirms the row exists.
    const notFound = new Error("Product translation not found.");
    mocks.productTranslationRepository.findProductTranslationById.mockRejectedValue(
      notFound,
    );

    await expect(
      service.getProductTranslationById({ id: TRANSLATION_ID, ...asSeller }),
    ).rejects.toBe(notFound);
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
    mocks.productTranslationRepository.findProductTranslationById.mockResolvedValue(
      makeProductTranslation(),
    );
    mocks.productTranslationRepository.updateProductTranslation.mockResolvedValue(
      makeProductTranslation(),
    );
  });

  it("checks ownership of the row before writing", async () => {
    await service.updateProductTranslation({
      id: TRANSLATION_ID,
      data: makeUpdateBody(),
      ...asSeller,
    });

    expect(
      mocks.productTranslationRepository.findProductTranslationById,
    ).toHaveBeenCalledWith(TRANSLATION_ID, ownTranslationFence());
    expect(
      mocks.productTranslationRepository.updateProductTranslation,
    ).toHaveBeenCalledWith({
      id: TRANSLATION_ID,
      data: { name: "Updated Name", updatedById: USER_ID },
    });
  });

  it("refuses to move a translation onto a product the caller does not own", async () => {
    const denied = new Error("Product with ID other not found.");
    mocks.productTranslationRepository.validateProduct.mockRejectedValue(
      denied,
    );

    await expect(
      service.updateProductTranslation({
        id: TRANSLATION_ID,
        data: makeUpdateBody({ productId: "other" }),
        ...asSeller,
      }),
    ).rejects.toBe(denied);

    expect(
      mocks.productTranslationRepository.validateProduct,
    ).toHaveBeenCalledWith("other", ownProductFence());
    expect(
      mocks.productTranslationRepository.updateProductTranslation,
    ).not.toHaveBeenCalled();
  });

  it("skips product validation when productId is not in the body", async () => {
    await service.updateProductTranslation({
      id: TRANSLATION_ID,
      data: makeUpdateBody(),
      ...asAdmin,
    });

    expect(
      mocks.productTranslationRepository.validateProduct,
    ).not.toHaveBeenCalled();
  });

  it("does not write when the row is outside the caller's fence", async () => {
    const notFound = new Error("Product translation not found.");
    mocks.productTranslationRepository.findProductTranslationById.mockRejectedValue(
      notFound,
    );

    await expect(
      service.updateProductTranslation({
        id: TRANSLATION_ID,
        data: makeUpdateBody(),
        ...asSeller,
      }),
    ).rejects.toBe(notFound);
    expect(
      mocks.productTranslationRepository.updateProductTranslation,
    ).not.toHaveBeenCalled();
  });

  it("returns the updated translation unchanged", async () => {
    const updated = makeProductTranslation({ name: "Updated Name" });
    mocks.productTranslationRepository.updateProductTranslation.mockResolvedValue(
      updated,
    );

    const result = await service.updateProductTranslation({
      id: TRANSLATION_ID,
      data: makeUpdateBody(),
      ...asAdmin,
    });

    expect(result).toBe(updated);
  });
});

describe("ProductTranslationService - deleteProductTranslation", () => {
  let service: ProductTranslationService;
  let mocks: ProductTranslationServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupProductTranslationService());
    mocks.productTranslationRepository.findProductTranslationById.mockResolvedValue(
      makeProductTranslation(),
    );
    mocks.productTranslationRepository.deleteProductTranslation.mockResolvedValue(
      makeProductTranslation(),
    );
  });

  it("checks ownership, then soft-deletes with the caller's id", async () => {
    await service.deleteProductTranslation({ id: TRANSLATION_ID, ...asSeller });

    expect(
      mocks.productTranslationRepository.findProductTranslationById,
    ).toHaveBeenCalledWith(TRANSLATION_ID, ownTranslationFence());
    expect(
      mocks.productTranslationRepository.deleteProductTranslation,
    ).toHaveBeenCalledWith({ id: TRANSLATION_ID, userId: USER_ID });
  });

  it("does not delete a row outside the caller's fence", async () => {
    const notFound = new Error("Product translation not found.");
    mocks.productTranslationRepository.findProductTranslationById.mockRejectedValue(
      notFound,
    );

    await expect(
      service.deleteProductTranslation({ id: TRANSLATION_ID, ...asSeller }),
    ).rejects.toBe(notFound);
    expect(
      mocks.productTranslationRepository.deleteProductTranslation,
    ).not.toHaveBeenCalled();
  });

  it("returns the deletion result unchanged", async () => {
    const deleted = makeProductTranslation({ deletedById: USER_ID });
    mocks.productTranslationRepository.deleteProductTranslation.mockResolvedValue(
      deleted,
    );

    const result = await service.deleteProductTranslation({
      id: TRANSLATION_ID,
      ...asAdmin,
    });

    expect(result).toBe(deleted);
  });
});
