import { ProductRepository } from "@/repositories/product/product.repository";

import {
  CATEGORY_ID_1,
  LANGUAGE_ID,
  anyDate,
  containing,
  makeProduct,
  setupProductRepository,
  ProductMocks,
} from "./product-test-harness";

/** Shape of the argument passed to prisma.product.findMany. */
interface FindManyCallArgs {
  where: {
    publishedAt?: Record<string, unknown>;
    OR?: unknown[];
    [key: string]: unknown;
  };
  select?: unknown;
  take?: number;
  skip?: number;
  orderBy?: unknown;
}

/** Typed accessor for calls to findMany mock. */
const findManyCallArgOf = (
  mocks: ProductMocks,
  callIndex = 0,
): FindManyCallArgs => {
  const mockedFn = jest.mocked(mocks.prismaService.product.findMany);
  const calls = mockedFn.mock.calls as unknown[][];
  return calls[callIndex]?.[0] as FindManyCallArgs;
};

describe("ProductRepository - findManyProducts", () => {
  let repository: ProductRepository;
  let mocks: ProductMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductRepository());
  });

  describe("happy path", () => {
    it("returns products and their count with default filters", async () => {
      // Arrange
      const products = [makeProduct(), makeProduct({ id: "product-2" })];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(2);
      mocks.prismaService.$transaction.mockResolvedValue([products, 2]);

      // Act
      const result = await repository.findManyProducts(
        {
          query: {},
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(result).toEqual({ products, productsCount: 2 });
    });

    it("filters by brand IDs when provided", async () => {
      // Arrange
      const products = [makeProduct()];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(1);
      mocks.prismaService.$transaction.mockResolvedValue([products, 1]);

      // Act
      await repository.findManyProducts(
        {
          query: { brandIds: ["brand-1", "brand-2"] },
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.product.findMany).toHaveBeenCalledWith(
        containing({
          where: containing({
            brandId: { in: ["brand-1", "brand-2"] },
            deletedAt: null,
          }),
        }),
      );
    });

    it("filters by category IDs using nested some query", async () => {
      // Arrange
      const products = [makeProduct()];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(1);
      mocks.prismaService.$transaction.mockResolvedValue([products, 1]);

      // Act
      await repository.findManyProducts(
        {
          query: { categoryIds: [CATEGORY_ID_1] },
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.product.findMany).toHaveBeenCalledWith(
        containing({
          where: containing({
            categories: { some: { id: { in: [CATEGORY_ID_1] } } },
            deletedAt: null,
          }),
        }),
      );
    });

    it("filters by price range when min and max are provided", async () => {
      // Arrange
      const products = [makeProduct()];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(1);
      mocks.prismaService.$transaction.mockResolvedValue([products, 1]);

      // Act
      await repository.findManyProducts(
        {
          query: { minPrice: 50, maxPrice: 150 },
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.product.findMany).toHaveBeenCalledWith(
        containing({
          where: containing({
            basePrice: { gte: 50, lte: 150 },
            deletedAt: null,
          }),
        }),
      );
    });

    it("filters by product name case-insensitively", async () => {
      // Arrange
      const products = [makeProduct()];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(1);
      mocks.prismaService.$transaction.mockResolvedValue([products, 1]);

      // Act
      await repository.findManyProducts(
        {
          query: { name: "Test" },
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.product.findMany).toHaveBeenCalledWith(
        containing({
          where: containing({
            name: { contains: "Test", mode: "insensitive" },
            deletedAt: null,
          }),
        }),
      );
    });

    it("filters by created by user ID", async () => {
      // Arrange
      const userId = "user-123";
      const products = [makeProduct()];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(1);
      mocks.prismaService.$transaction.mockResolvedValue([products, 1]);

      // Act
      await repository.findManyProducts(
        {
          query: { createdById: userId },
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.product.findMany).toHaveBeenCalledWith(
        containing({
          where: containing({
            createdById: userId,
            deletedAt: null,
          }),
        }),
      );
    });

    it("filters only public products when isPublic is true", async () => {
      // Arrange
      const products = [makeProduct()];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(1);
      mocks.prismaService.$transaction.mockResolvedValue([products, 1]);

      // Act
      await repository.findManyProducts(
        {
          query: { isPublic: true },
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      const callArgs = findManyCallArgOf(mocks);
      expect(callArgs.where.publishedAt).toEqual({
        lte: anyDate(),
        not: null,
      });
    });

    it("filters only unpublished products when isPublic is false", async () => {
      // Arrange
      const products = [makeProduct()];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(1);
      mocks.prismaService.$transaction.mockResolvedValue([products, 1]);

      // Act
      await repository.findManyProducts(
        {
          query: { isPublic: false },
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      const callArgs = findManyCallArgOf(mocks);
      expect(callArgs.where.OR).toEqual([
        { publishedAt: { gt: anyDate() } },
        { publishedAt: null },
      ]);
    });

    it("applies take and skip for pagination", async () => {
      // Arrange
      const products = [makeProduct()];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(100);
      mocks.prismaService.$transaction.mockResolvedValue([products, 1]);

      // Act
      await repository.findManyProducts(
        {
          query: {},
          take: 20,
          skip: 40,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.product.findMany).toHaveBeenCalledWith(
        containing({
          take: 20,
          skip: 40,
        }),
      );
    });

    it("uses transaction to fetch products and count together", async () => {
      // Arrange
      const products = [makeProduct()];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(1);
      mocks.prismaService.$transaction.mockResolvedValue([products, 1]);

      // Act
      await repository.findManyProducts(
        {
          query: {},
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.$transaction).toHaveBeenCalled();
    });

    it("always filters out deleted products", async () => {
      // Arrange
      const products = [makeProduct()];
      mocks.prismaService.product.findMany.mockResolvedValue(products);
      mocks.prismaService.product.count.mockResolvedValue(1);
      mocks.prismaService.$transaction.mockResolvedValue([products, 1]);

      // Act
      await repository.findManyProducts(
        {
          query: {},
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.product.findMany).toHaveBeenCalledWith(
        containing({
          where: containing({ deletedAt: null }),
        }),
      );
    });
  });

  describe("error handling", () => {
    it("throws internal error on database failure", async () => {
      // Arrange
      const error = new Error("Database connection failed");
      mocks.prismaService.$transaction.mockRejectedValue(error);

      // Act
      const promise = repository.findManyProducts(
        {
          query: {},
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 500,
        response: { message: "Failed to fetch products" },
      });
    });
  });
});
