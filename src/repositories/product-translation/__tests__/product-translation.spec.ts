import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { ProductTranslationRepository } from "@/repositories/product-translation/product-translation.repository";

import {
  LANGUAGE_ID,
  PRODUCT_ID,
  PRODUCT_TRANSLATION_ID,
  USER_ID,
  anyDate,
  containing,
  stringContaining,
  makeProduct,
  makeProductTranslation,
  setupProductTranslationRepository,
  ProductTranslationMocks,
} from "./product-translation-test-harness";

describe("ProductTranslationRepository - findManyProductTranslations", () => {
  let repository: ProductTranslationRepository;
  let mocks: ProductTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductTranslationRepository());
  });

  it("returns translations and their count with filters", async () => {
    // Arrange
    const translations = [makeProductTranslation()];
    mocks.prismaService.productTranslation.findMany.mockResolvedValue(
      translations,
    );
    mocks.prismaService.productTranslation.count.mockResolvedValue(1);

    // Act
    const result = await repository.findManyProductTranslations({
      where: { productId: PRODUCT_ID },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    // Assert
    expect(result).toEqual({
      productTranslations: translations,
      productTranslationsCount: 1,
    });
  });

  it("always filters out deleted translations", async () => {
    // Arrange
    mocks.prismaService.productTranslation.findMany.mockResolvedValue([]);
    mocks.prismaService.productTranslation.count.mockResolvedValue(0);

    // Act
    await repository.findManyProductTranslations({
      where: {},
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    // Assert
    expect(
      mocks.prismaService.productTranslation.findMany,
    ).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
      }),
    );
  });

  it("applies pagination", async () => {
    // Arrange
    const translations = [makeProductTranslation()];
    mocks.prismaService.productTranslation.findMany.mockResolvedValue(
      translations,
    );
    mocks.prismaService.productTranslation.count.mockResolvedValue(50);

    // Act
    await repository.findManyProductTranslations({
      where: {},
      take: 20,
      skip: 40,
      orderBy: { createdAt: "desc" },
    });

    // Assert
    expect(
      mocks.prismaService.productTranslation.findMany,
    ).toHaveBeenCalledWith(
      containing({
        take: 20,
        skip: 40,
      }),
    );
  });

  it("throws internal error on database failure", async () => {
    // Arrange
    mocks.prismaService.productTranslation.findMany.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const promise = repository.findManyProductTranslations({
      where: {},
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
      response: {
        message: "An error occurred while fetching product translations.",
      },
    });
  });
});

describe("ProductTranslationRepository - findProductTranslationById", () => {
  let repository: ProductTranslationRepository;
  let mocks: ProductTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductTranslationRepository());
  });

  it("returns a translation by ID", async () => {
    // Arrange
    const translation = makeProductTranslation();
    mocks.prismaService.productTranslation.findUniqueOrThrow.mockResolvedValue(
      translation,
    );

    // Act
    const result = await repository.findProductTranslationById(
      PRODUCT_TRANSLATION_ID,
    );

    // Assert
    expect(result).toEqual(translation);
  });

  it("throws notFound error when translation does not exist", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.productTranslation.findUniqueOrThrow.mockRejectedValue(
      error,
    );

    // Act
    const promise = repository.findProductTranslationById("non-existent");

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Product translation not found." },
    });
  });

  it("throws internal error on unexpected database failure", async () => {
    // Arrange
    mocks.prismaService.productTranslation.findUniqueOrThrow.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const promise = repository.findProductTranslationById(
      PRODUCT_TRANSLATION_ID,
    );

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
      response: {
        message: "An error occurred while fetching the product translation.",
      },
    });
  });
});

describe("ProductTranslationRepository - validateProduct", () => {
  let repository: ProductTranslationRepository;
  let mocks: ProductTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductTranslationRepository());
  });

  it("returns product when it exists and is not deleted", async () => {
    // Arrange
    const product = makeProduct();
    mocks.prismaService.product.findUniqueOrThrow.mockResolvedValue(product);

    // Act
    const result = await repository.validateProduct(PRODUCT_ID);

    // Assert
    expect(result).toEqual(product);
  });

  it("throws notFound error when product does not exist", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.product.findUniqueOrThrow.mockRejectedValue(error);

    // Act
    const promise = repository.validateProduct("non-existent");

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: stringContaining("not found") },
    });
  });
});

describe("ProductTranslationRepository - createProductTranslation", () => {
  let repository: ProductTranslationRepository;
  let mocks: ProductTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductTranslationRepository());
  });

  it("creates a translation with provided data", async () => {
    // Arrange
    const translation = makeProductTranslation();
    const data = {
      productId: PRODUCT_ID,
      languageId: LANGUAGE_ID,
      name: "Translation",
      description: "Description",
    };
    mocks.prismaService.productTranslation.create.mockResolvedValue(
      translation,
    );

    // Act
    const result = await repository.createProductTranslation({ data });

    // Assert
    expect(result).toEqual(translation);
    expect(mocks.prismaService.productTranslation.create).toHaveBeenCalledWith(
      containing({ data }),
    );
  });

  it("throws unprocessable error on foreign key constraint", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError("Foreign key constraint", {
      code: "P2003",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.productTranslation.create.mockRejectedValue(error);

    // Act
    const promise = repository.createProductTranslation({
      data: {
        productId: "invalid",
        languageId: LANGUAGE_ID,
        name: "Test",
        description: "A test translation",
      },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: {
        message: stringContaining("Invalid foreign key"),
      },
    });
  });

  it("throws internal error on unexpected database failure", async () => {
    // Arrange
    mocks.prismaService.productTranslation.create.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const promise = repository.createProductTranslation({
      data: {
        productId: PRODUCT_ID,
        languageId: LANGUAGE_ID,
        name: "Test",
        description: "A test translation",
      },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
      response: { message: "Failed to create product translation." },
    });
  });
});

describe("ProductTranslationRepository - updateProductTranslation", () => {
  let repository: ProductTranslationRepository;
  let mocks: ProductTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductTranslationRepository());
  });

  it("updates a translation with provided data", async () => {
    // Arrange
    const translation = makeProductTranslation({ name: "Updated" });
    const data = { name: "Updated" };
    mocks.prismaService.productTranslation.update.mockResolvedValue(
      translation,
    );

    // Act
    const result = await repository.updateProductTranslation({
      id: PRODUCT_TRANSLATION_ID,
      data,
    });

    // Assert
    expect(result).toEqual(translation);
    expect(mocks.prismaService.productTranslation.update).toHaveBeenCalledWith(
      containing({
        where: { id: PRODUCT_TRANSLATION_ID, deletedAt: null },
        data,
      }),
    );
  });

  it("throws unprocessable error on unique constraint", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.productTranslation.update.mockRejectedValue(error);

    // Act
    const promise = repository.updateProductTranslation({
      id: PRODUCT_TRANSLATION_ID,
      data: { name: "Product" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: {
        message: stringContaining("already exists"),
      },
    });
  });

  it("throws notFound error when translation does not exist", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.productTranslation.update.mockRejectedValue(error);

    // Act
    const promise = repository.updateProductTranslation({
      id: "non-existent",
      data: { name: "Updated" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: stringContaining("not found") },
    });
  });

  it("throws unprocessable error on foreign key constraint", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError("Foreign key constraint", {
      code: "P2003",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.productTranslation.update.mockRejectedValue(error);

    // Act
    const promise = repository.updateProductTranslation({
      id: PRODUCT_TRANSLATION_ID,
      data: { productId: "invalid" },
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: {
        message: stringContaining("Invalid foreign key"),
      },
    });
  });
});

describe("ProductTranslationRepository - deleteProductTranslation", () => {
  let repository: ProductTranslationRepository;
  let mocks: ProductTranslationMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductTranslationRepository());
  });

  it("soft deletes a translation", async () => {
    // Arrange
    const translation = makeProductTranslation({ deletedAt: new Date() });
    mocks.prismaService.productTranslation.update.mockResolvedValue(
      translation,
    );

    // Act
    const result = await repository.deleteProductTranslation({
      id: PRODUCT_TRANSLATION_ID,
      userId: USER_ID,
    });

    // Assert
    expect(result).toEqual(translation);
    expect(mocks.prismaService.productTranslation.update).toHaveBeenCalledWith(
      containing({
        where: { id: PRODUCT_TRANSLATION_ID, deletedAt: null },
        data: containing({
          deletedAt: anyDate(),
          deletedById: USER_ID,
          updatedById: USER_ID,
        }),
      }),
    );
  });

  it("throws notFound error when translation does not exist", async () => {
    // Arrange
    const error = new PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });
    mocks.prismaService.productTranslation.update.mockRejectedValue(error);

    // Act
    const promise = repository.deleteProductTranslation({
      id: "non-existent",
      userId: USER_ID,
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: stringContaining("not found") },
    });
  });

  it("throws internal error on unexpected database failure", async () => {
    // Arrange
    mocks.prismaService.productTranslation.update.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const promise = repository.deleteProductTranslation({
      id: PRODUCT_TRANSLATION_ID,
      userId: USER_ID,
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
      response: {
        message: stringContaining("Failed to delete"),
      },
    });
  });
});
