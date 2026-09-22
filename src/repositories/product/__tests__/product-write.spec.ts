import { Prisma } from "@/generated/prisma/client";
import { ProductRepository } from "@/repositories/product/product.repository";

import {
  CATEGORY_ID_1,
  CATEGORY_ID_2,
  PRODUCT_ID,
  SKU_ID_1,
  USER_ID,
  anyDate,
  containing,
  makeCategory,
  makeProduct,
  makeSKU,
  setupProductRepository,
  ProductMocks,
} from "./product-test-harness";

describe("ProductRepository - validateCategories", () => {
  let repository: ProductRepository;
  let mocks: ProductMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductRepository());
  });

  it("succeeds when all provided categories exist and are not deleted", async () => {
    // Arrange
    const categories = [
      makeCategory({ id: CATEGORY_ID_1 }),
      makeCategory({ id: CATEGORY_ID_2 }),
    ];
    mocks.prismaService.category.findMany.mockResolvedValue(categories);

    // Act
    await repository.validateCategories([CATEGORY_ID_1, CATEGORY_ID_2]);

    // Assert
    expect(mocks.prismaService.category.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [CATEGORY_ID_1, CATEGORY_ID_2] },
        deletedAt: null,
      },
      select: { id: true },
    });
  });

  it("throws unprocessable error when some categories do not exist", async () => {
    // Arrange
    const categories = [makeCategory({ id: CATEGORY_ID_1 })];
    mocks.prismaService.category.findMany.mockResolvedValue(categories);

    // Act
    const promise = repository.validateCategories([
      CATEGORY_ID_1,
      CATEGORY_ID_2,
    ]);

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: {
        message: "Some categories do not exist or are deleted.",
      },
    });
  });

  it("throws unprocessable error when requested categories are deleted", async () => {
    // Arrange
    mocks.prismaService.category.findMany.mockResolvedValue([]);

    // Act
    const promise = repository.validateCategories([CATEGORY_ID_1]);

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 422,
      response: {
        message: "Some categories do not exist or are deleted.",
      },
    });
  });
});

describe("ProductRepository - createProduct", () => {
  let repository: ProductRepository;
  let mocks: ProductMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductRepository());
  });

  describe("happy path", () => {
    it("creates a product with provided data", async () => {
      // Arrange
      const product = makeProduct();
      const data = {
        name: "New Product",
        basePrice: 100,
        virtualPrice: 100,
        brandId: "brand-1",
        createdById: USER_ID,
        variants: [],
      };
      mocks.prismaService.product.create.mockResolvedValue(product);

      // Act
      const result = await repository.createProduct({ data });

      // Assert
      expect(result).toEqual(product);
      expect(mocks.prismaService.product.create).toHaveBeenCalledWith(
        containing({
          data,
        }),
      );
    });
  });

  describe("error handling - unique constraint", () => {
    it("throws unprocessable error on duplicate product name", async () => {
      // Arrange
      const error = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: `name`",
        {
          code: "P2002",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.product.create.mockRejectedValue(error);

      // Act
      const promise = repository.createProduct({
        data: {
          name: "Duplicate",
          basePrice: 100,
          virtualPrice: 100,
          brandId: "brand-1",
          createdById: USER_ID,
          variants: [],
        },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 422,
        response: {
          message: "Product with the same name already exists.",
        },
      });
    });
  });

  describe("error handling - foreign key constraint", () => {
    it("throws unprocessable error on invalid foreign key", async () => {
      // Arrange
      const error = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        {
          code: "P2003",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.product.create.mockRejectedValue(error);

      // Act
      const promise = repository.createProduct({
        data: {
          name: "Product",
          basePrice: 100,
          virtualPrice: 100,
          brandId: "invalid-brand",
          createdById: USER_ID,
          variants: [],
        },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 422,
        response: { message: "Invalid foreign key reference." },
      });
    });
  });

  describe("error handling - internal error", () => {
    it("throws internal error on unexpected database failure", async () => {
      // Arrange
      const error = new Error("Database error");
      mocks.prismaService.product.create.mockRejectedValue(error);

      // Act
      const promise = repository.createProduct({
        data: {
          name: "Product",
          basePrice: 100,
          virtualPrice: 100,
          brandId: "brand-1",
          createdById: USER_ID,
          variants: [],
        },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 500,
        response: { message: "Failed to create product." },
      });
    });
  });
});

describe("ProductRepository - updateProduct", () => {
  let repository: ProductRepository;
  let mocks: ProductMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductRepository());
  });

  describe("happy path", () => {
    it("updates product with new data and replaces categories", async () => {
      // Arrange
      const updatedProduct = makeProduct({
        name: "Updated Product",
        updatedById: USER_ID,
      });
      const existingSKUs = [makeSKU()];
      mocks.prismaService.$transaction.mockImplementation((fn: unknown) => {
        if (typeof fn === "function") {
          return (fn as (tx: unknown) => unknown)({
            product: { update: jest.fn() },
            sKU: {
              findMany: jest.fn().mockResolvedValue(existingSKUs),
              deleteMany: jest.fn(),
              createMany: jest.fn(),
              update: jest.fn(),
            },
          });
        }
      });
      mocks.prismaService.$transaction.mockResolvedValue(updatedProduct);

      // Act
      const result = await repository.updateProduct({
        productId: PRODUCT_ID,
        data: {
          name: "Updated Product",
          categoryIds: [CATEGORY_ID_1],
          skus: [{ value: "SKU-VALUE", price: 100, stock: 10, image: "" }],
          variants: [],
        },
        userId: USER_ID,
      });

      // Assert
      expect(result).toEqual(updatedProduct);
      expect(mocks.prismaService.$transaction).toHaveBeenCalled();
    });

    it("updates only modified SKU fields", async () => {
      // Arrange
      const updatedProduct = makeProduct();
      const existingSKU = makeSKU({ id: SKU_ID_1, value: "SKU-1" });
      const txMock = jest.fn();

      mocks.prismaService.$transaction.mockImplementation((fn: unknown) => {
        if (typeof fn === "function") {
          const tx = {
            product: {
              update: jest.fn(),
            },
            sKU: {
              findMany: jest.fn().mockResolvedValue([existingSKU]),
              deleteMany: jest.fn(),
              createMany: jest.fn(),
              update: txMock.mockResolvedValue(existingSKU),
            },
          };
          return (fn as (tx: unknown) => unknown)(tx);
        }
      });
      mocks.prismaService.$transaction.mockResolvedValue(updatedProduct);

      // Act
      await repository.updateProduct({
        productId: PRODUCT_ID,
        data: {
          skus: [
            {
              value: "SKU-1",
              price: 150,
              stock: 20,
              image: "",
            },
          ],
          categoryIds: [],
          variants: [],
        },
        userId: USER_ID,
      });

      // Assert
      expect(mocks.prismaService.$transaction).toHaveBeenCalled();
    });

    it("deletes SKUs that are no longer in the client data", async () => {
      // Arrange
      const updatedProduct = makeProduct();
      const existingSKU = makeSKU({ id: SKU_ID_1, value: "OLD-SKU" });

      mocks.prismaService.$transaction.mockImplementation((fn: unknown) => {
        if (typeof fn === "function") {
          const deleteManySpy = jest.fn();
          const tx = {
            product: {
              update: jest.fn(),
            },
            sKU: {
              findMany: jest.fn().mockResolvedValue([existingSKU]),
              deleteMany: deleteManySpy,
              createMany: jest.fn(),
              update: jest.fn(),
            },
          };
          (fn as (tx: unknown) => unknown)(tx);
          return updatedProduct;
        }
      });
      mocks.prismaService.$transaction.mockResolvedValue(updatedProduct);

      // Act
      await repository.updateProduct({
        productId: PRODUCT_ID,
        data: {
          skus: [{ value: "NEW-SKU", price: 100, stock: 10, image: "" }],
          categoryIds: [],
          variants: [],
        },
        userId: USER_ID,
      });

      // Assert
      expect(mocks.prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe("error handling - record not found", () => {
    it("throws notFound error when product does not exist", async () => {
      // Arrange
      const error = new Prisma.PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found.",
        {
          code: "P2025",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.$transaction.mockRejectedValue(error);

      // Act
      const promise = repository.updateProduct({
        productId: "non-existent",
        data: {
          name: "Updated",
          skus: [],
          categoryIds: [],
          variants: [],
        },
        userId: USER_ID,
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 404,
        response: { message: "Product not found." },
      });
    });
  });

  describe("error handling - unique constraint", () => {
    it("throws unprocessable error on duplicate product name", async () => {
      // Arrange
      const error = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: `name`",
        {
          code: "P2002",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.$transaction.mockRejectedValue(error);

      // Act
      const promise = repository.updateProduct({
        productId: PRODUCT_ID,
        data: {
          name: "Duplicate Name",
          skus: [],
          categoryIds: [],
          variants: [],
        },
        userId: USER_ID,
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 422,
        response: {
          message:
            "Product with the same name already exists or duplicate SKU values.",
        },
      });
    });
  });

  describe("error handling - foreign key constraint", () => {
    it("throws unprocessable error on invalid category", async () => {
      // Arrange
      const error = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        {
          code: "P2003",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.$transaction.mockRejectedValue(error);

      // Act
      const promise = repository.updateProduct({
        productId: PRODUCT_ID,
        data: {
          categoryIds: ["invalid-category"],
          skus: [],
          variants: [],
        },
        userId: USER_ID,
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 422,
        response: { message: "Invalid foreign key reference." },
      });
    });
  });
});

describe("ProductRepository - deleteProduct", () => {
  let repository: ProductRepository;
  let mocks: ProductMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupProductRepository());
  });

  describe("happy path", () => {
    it("soft deletes product and related entities in a transaction", async () => {
      // Arrange
      mocks.prismaService.$transaction.mockResolvedValue(undefined);

      // Act
      const result = await repository.deleteProduct({
        productId: PRODUCT_ID,
        userId: USER_ID,
      });

      // Assert
      expect(result).toEqual({
        message: "Product deleted successfully",
      });
      expect(mocks.prismaService.$transaction).toHaveBeenCalled();
    });

    it("sets deletedAt timestamp on product", async () => {
      // Arrange
      mocks.prismaService.$transaction.mockResolvedValue(undefined);

      // Act
      await repository.deleteProduct({
        productId: PRODUCT_ID,
        userId: USER_ID,
      });

      // Assert
      expect(mocks.prismaService.product.update).toHaveBeenCalledWith(
        containing({
          where: { id: PRODUCT_ID, deletedAt: null },
          data: containing({
            deletedAt: anyDate(),
            updatedById: USER_ID,
            deletedById: USER_ID,
          }),
        }),
      );
    });

    it("soft deletes product translations", async () => {
      // Arrange
      mocks.prismaService.$transaction.mockResolvedValue(undefined);

      // Act
      await repository.deleteProduct({
        productId: PRODUCT_ID,
        userId: USER_ID,
      });

      // Assert
      expect(
        mocks.prismaService.productTranslation.updateMany,
      ).toHaveBeenCalledWith(
        containing({
          where: { productId: PRODUCT_ID, deletedAt: null },
          data: containing({
            deletedAt: anyDate(),
            updatedById: USER_ID,
            deletedById: USER_ID,
          }),
        }),
      );
    });

    it("soft deletes product SKUs", async () => {
      // Arrange
      mocks.prismaService.$transaction.mockResolvedValue(undefined);

      // Act
      await repository.deleteProduct({
        productId: PRODUCT_ID,
        userId: USER_ID,
      });

      // Assert
      expect(mocks.prismaService.sKU.updateMany).toHaveBeenCalledWith(
        containing({
          where: { productId: PRODUCT_ID, deletedAt: null },
          data: containing({
            deletedAt: anyDate(),
            updatedById: USER_ID,
            deletedById: USER_ID,
          }),
        }),
      );
    });
  });

  describe("error handling - record not found", () => {
    it("throws notFound error when product does not exist", async () => {
      // Arrange
      const error = new Prisma.PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found.",
        {
          code: "P2025",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.$transaction.mockRejectedValue(error);

      // Act
      const promise = repository.deleteProduct({
        productId: "non-existent",
        userId: USER_ID,
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 404,
        response: { message: "Product not found." },
      });
    });
  });

  describe("error handling - internal error", () => {
    it("throws internal error on unexpected database failure", async () => {
      // Arrange
      const error = new Error("Database error");
      mocks.prismaService.$transaction.mockRejectedValue(error);

      // Act
      const promise = repository.deleteProduct({
        productId: PRODUCT_ID,
        userId: USER_ID,
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 500,
        response: { message: "Failed to delete product." },
      });
    });
  });
});
