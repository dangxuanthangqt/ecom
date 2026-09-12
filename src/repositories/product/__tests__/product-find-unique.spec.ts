import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { ProductRepository } from "@/repositories/product/product.repository";

import {
  PRODUCT_ID,
  makeProduct,
  setupProductRepository,
  ProductMocks,
} from "./product-test-harness";

describe("ProductRepository - findUniqueProduct", () => {
  let repository: ProductRepository;
  let mocks: ProductMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductRepository());
  });

  describe("happy path", () => {
    it("returns a product by ID with provided select clause", async () => {
      // Arrange
      const product = makeProduct();
      const selectClause = { id: true, name: true };
      mocks.prismaService.product.findUniqueOrThrow.mockResolvedValue(product);

      // Act
      const result = await repository.findUniqueProduct({
        where: { id: PRODUCT_ID },
        select: selectClause,
      });

      // Assert
      expect(result).toEqual(product);
      expect(
        mocks.prismaService.product.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID },
        select: selectClause,
      });
    });

    it("returns a product by ID without select clause", async () => {
      // Arrange
      const product = makeProduct();
      mocks.prismaService.product.findUniqueOrThrow.mockResolvedValue(product);

      // Act
      const result = await repository.findUniqueProduct({
        where: { id: PRODUCT_ID },
      });

      // Assert
      expect(result).toEqual(product);
      expect(
        mocks.prismaService.product.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID },
        select: undefined,
      });
    });

    it("passes where clause through to Prisma", async () => {
      // Arrange
      const product = makeProduct();
      const whereClause = { id: PRODUCT_ID, name: "Test" };
      mocks.prismaService.product.findUniqueOrThrow.mockResolvedValue(product);

      // Act
      await repository.findUniqueProduct({
        where: whereClause,
      });

      // Assert
      expect(
        mocks.prismaService.product.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: whereClause,
        select: undefined,
      });
    });
  });

  describe("error handling - record not found", () => {
    it("throws notFound error when product does not exist", async () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found.",
        {
          code: "P2025",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.product.findUniqueOrThrow.mockRejectedValue(error);

      // Act
      const promise = repository.findUniqueProduct({
        where: { id: "non-existent" },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 404,
        response: { message: "Product not found" },
      });
    });
  });

  describe("error handling - internal error", () => {
    it("throws internal error on unexpected database failure", async () => {
      // Arrange
      const error = new Error("Database connection lost");
      mocks.prismaService.product.findUniqueOrThrow.mockRejectedValue(error);

      // Act
      const promise = repository.findUniqueProduct({
        where: { id: PRODUCT_ID },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 500,
        response: { message: "Failed to fetch product" },
      });
    });
  });
});
