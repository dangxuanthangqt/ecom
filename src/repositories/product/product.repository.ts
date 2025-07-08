import { Injectable, Logger } from "@nestjs/common";
import {
  Category as CategorySchema,
  Language as LanguageSchema,
  Prisma,
  Product as ProductSchema,
  User as UserSchema,
} from "@prisma/client";
import { isDefined } from "class-validator";

import {
  ProductManageQueryDto,
  UpdateProductRequestDto,
} from "@/dtos/product/product.dto";
import {
  UpsertSKURequestDto,
  UpsertSKUWithIdRequestDto,
} from "@/dtos/sku/sku.dto";
import { createProductSelect } from "@/selectors/product.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class ProductRepository {
  private logger = new Logger(ProductRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds multiple products based on the provided query parameters and pagination options.
   *
   * @param params - The parameters for finding products
   * @param params.query - The query parameters for filtering products
   * @param params.take - The maximum number of products to return
   * @param params.skip - The number of products to skip for pagination
   * @param params.orderBy - The ordering criteria for the products
   * @param languageId - The language ID for localized content
   * @returns Promise that resolves to an object containing the products and their count
   * @throws {HttpException} Throws a 500 "internal" exception if the database operation fails
   */
  async findManyProducts(
    {
      query: {
        brandIds,
        categoryIds,
        minPrice,
        maxPrice,
        isPublic,
        name,
        createdById,
      },
      take,
      skip,
      orderBy,
    }: Pick<Prisma.ProductFindManyArgs, "take" | "skip" | "orderBy"> & {
      query: Partial<ProductManageQueryDto>;
    },
    languageId: LanguageSchema["id"],
  ) {
    try {
      let combinedWhere: Prisma.ProductWhereInput = {
        brandId: brandIds?.length ? { in: brandIds } : undefined,
        categories: categoryIds?.length
          ? { some: { id: { in: categoryIds } } }
          : undefined,
        basePrice:
          isDefined(minPrice) || isDefined(maxPrice)
            ? {
                ...(isDefined(minPrice) ? { gte: minPrice } : {}),
                ...(isDefined(maxPrice) ? { lte: maxPrice } : {}),
              }
            : undefined,
        name: isDefined(name)
          ? {
              contains: name,
              mode: "insensitive", // ← Không phân biệt hoa/thường
            }
          : undefined,
        createdById,
        deletedAt: null, // Ensure we only get non-deleted products
      };

      if (isPublic) {
        combinedWhere = {
          ...combinedWhere,
          publishedAt: { lte: new Date(), not: null },
        };
      } else if (isPublic === false) {
        combinedWhere = {
          ...combinedWhere,
          OR: [{ publishedAt: { gt: new Date() } }, { publishedAt: null }],
        };
      }

      const $products = this.prisma.product.findMany({
        where: combinedWhere,
        take,
        skip,
        orderBy,
        select: createProductSelect({
          languageId,
        }),
      });

      const $productsCount = this.prisma.product.count({
        where: combinedWhere,
      });

      // this is subsequent transaction
      const [products, productsCount] = await this.prisma.$transaction([
        $products,
        $productsCount,
      ]);

      return {
        products,
        productsCount,
      };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch products",
      });
    }
  }

  /**
   * Finds a unique product by its ID and includes translations based on the provided language ID.
   *
   * @param where - The conditions to find the product
   * @param languageId - The ID of the language for translations
   * @param select - Optional select object to specify fields to return
   * @returns Promise that resolves to the found product with translations
   * @throws {HttpException} Throws a 404 "notFound" exception if the product is not found
   * @throws {HttpException} Throws a 500 "internal" exception for other database errors
   */
  async findUniqueProduct<
    S extends Prisma.ProductSelect,
    T = Prisma.ProductGetPayload<{ select: S }>,
  >({
    where,
    select,
  }: {
    where: Prisma.ProductFindUniqueOrThrowArgs["where"];
    select?: S;
  }): Promise<T> {
    try {
      const product = await this.prisma.product.findUniqueOrThrow({
        where,
        select,
      });

      return product as T;
    } catch (error) {
      this.logger.error(error);
      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Product not found",
        });
      }
      throwHttpException({
        type: "internal",
        message: "Failed to fetch product",
      });
    }
  }

  /**
   * Validates the existence of categories by their IDs.
   *
   * @param categoryIds - An array of category IDs to validate
   * @returns Promise that resolves if all categories exist and are not deleted
   * @throws {HttpException} Throws a 422 "unprocessable" exception if any category does not exist or is deleted
   */
  async validateCategories(categoryIds: CategorySchema["id"][]) {
    const categories = await this.prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (categories.length !== categoryIds.length) {
      throwHttpException({
        type: "unprocessable",
        message: "Some categories do not exist or are deleted.",
      });
    }
  }

  /**
   * Creates a new product with the provided data.
   * @param data - The data for the new product, including translations and SKUs.
   * @returns The created product with its translations and SKUs.
   * @throws Throws an HTTP exception if the creation fails due to unique constraints or foreign key violations.
   * @throws Throws an HTTP exception if the creation fails for any other reason.
   *
   */
  async createProduct({ data }: { data: Prisma.ProductCreateArgs["data"] }) {
    try {
      const product = await this.prisma.product.create({
        data,
        select: createProductSelect(),
      });

      return product;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Product with the same name already exists.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Invalid foreign key reference.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create product.",
      });
    }
  }

  /**
   * Updates an existing product by its ID with the provided data.
   * This method handles updating product details, SKUs, and categories in a single transaction.
   * @param productId - The unique identifier of the product to update.
   * @param data - The data to update the product with, including SKUs and category IDs.
   * @param userId - The ID of the user performing the update, used for tracking changes.
   * @returns The updated product with its translations and SKUs.
   * @throws Throws an HTTP exception if the product is not found, or if there are
   *         unique constraint violations, foreign key violations, or other database errors.
   */
  async updateProduct({
    productId,
    data: { skus: skuFromClientData, categoryIds, ...productData },
    userId,
  }: {
    productId: ProductSchema["id"];
    data: UpdateProductRequestDto;
    userId: UserSchema["id"];
  }) {
    /**
     * Tạo một object để lưu thứ tự của SKUs từ dữ liệu client.
     * Điều này sẽ giúp chúng ta xác định thứ tự của SKUs khi cập nhật.
     * Ví dụ: nếu client gửi SKUs theo thứ tự [sku1, sku2, sku3],
     * thì skuOrder sẽ là { sku1: 0, sku2: 1, sku3: 2 }.
     * Điều này sẽ giúp chúng ta biết được thứ tự của SKUs
     * khi tạo mới hoặc cập nhật SKUs trong cơ sở dữ liệu.
     */
    const skuOrder: Record<string, number> = skuFromClientData.reduce(
      (acc, sku, index) => ({
        ...acc,
        [sku.value]: index,
      }),
      {},
    );

    try {
      // Thực hiện tất cả trong một transaction
      // this is interactive transaction
      // https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions
      const updatedProduct = await this.prisma.$transaction(async (tx) => {
        // 1. Cập nhật thông tin product (không có SKUs)
        await tx.product.update({
          where: { id: productId, deletedAt: null },
          data: {
            ...productData,
            updatedById: userId,
            categories: {
              set: categoryIds?.map((id) => ({ id })), // Xóa hết liên kết cũ, gán lại list mới
            },
          },
          select: null,
        });

        // 2. Lấy SKUs hiện có của product
        const existingSKUs = await tx.sKU.findMany({
          where: {
            productId,
            deletedAt: null,
          },
          select: {
            id: true,
            value: true,
          },
        });

        // SKUs cần xóa (có trong DB nhưng không có trong client data)
        const skusToDelete = existingSKUs.filter((dbSku) =>
          skuFromClientData.every(
            (clientSku) => clientSku.value !== dbSku.value,
          ),
        );

        // SKUs cần tạo mới và cần cập nhật
        const skusToCreate: UpsertSKURequestDto[] = [];
        const skusToUpdate: UpsertSKUWithIdRequestDto[] = [];

        for (const clientSKU of skuFromClientData) {
          const existingSKU = existingSKUs.find(
            (dbSku) => dbSku.value === clientSKU.value,
          );

          if (existingSKU) {
            skusToUpdate.push({
              id: existingSKU.id,
              ...clientSKU,
            });
          } else {
            skusToCreate.push(clientSKU);
          }
        }

        // 4. Thực hiện các thao tác SKU

        // Xóa SKUs không còn trong danh sách
        if (skusToDelete.length > 0) {
          await tx.sKU.deleteMany({
            where: {
              id: { in: skusToDelete.map((sku) => sku.id) },
            },
          });
        }

        // Tạo SKUs mới
        if (skusToCreate.length > 0) {
          await tx.sKU.createMany({
            data: skusToCreate.map(({ value, image, price, stock }) => ({
              value,
              image,
              price,
              stock,
              productId,
              createdById: userId,
              order: skuOrder[value],
            })),
          });
        }

        // Update existing SKUs
        if (skusToUpdate.length > 0) {
          const updatePromises = skusToUpdate.map(
            ({ id, value, image, price, stock }) =>
              tx.sKU.update({
                where: { id },
                data: {
                  value,
                  image,
                  price,
                  stock,
                  updatedById: userId,
                  order: skuOrder[value],
                },
              }),
          );

          // Execute all updates concurrently
          await Promise.all(updatePromises);
        }

        // 5. Lấy product đã cập nhật với SKUs mới
        return await tx.product.findUniqueOrThrow({
          where: { id: productId, deletedAt: null },
          select: createProductSelect(),
        });
      });

      return updatedProduct;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Product not found.",
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message:
            "Product with the same name already exists or duplicate SKU values.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Invalid foreign key reference.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update product.",
      });
    }
  }

  /**
   * Soft deletes a product and its associated SKUs by setting their deletedAt timestamp.
   *
   * This method performs a soft delete operation on both the product and all its related SKUs
   * within a database transaction to ensure data consistency. The deletion is tracked with
   * timestamps and user information for audit purposes.
   *
   * @param params - The deletion parameters
   * @param params.productId - The unique identifier of the product to delete
   * @param params.userId - The ID of the user performing the deletion operation
   *
   * @returns Promise that resolves to a success message object
   * @returns Returns `{ message: "Product deleted successfully" }` on successful deletion
   *
   * @throws {HttpException} Throws a 404 Not Found exception if the product doesn't exist
   * @throws {HttpException} Throws a 500 Internal Server Error exception for other database errors
   *
   */
  async deleteProduct({
    productId,
    userId,
  }: {
    productId: ProductSchema["id"];
    userId: UserSchema["id"];
  }) {
    try {
      const $updateProduct = this.prisma.product.update({
        where: { id: productId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          updatedById: userId,
          deletedById: userId,
        },
      });

      const $updateProductTranslation =
        this.prisma.productTranslation.updateMany({
          where: { productId, deletedAt: null },
          data: {
            deletedAt: new Date(),
            updatedById: userId,
            deletedById: userId,
          },
        });

      const $updateSKUs = this.prisma.sKU.updateMany({
        where: { productId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          updatedById: userId,
          deletedById: userId,
        },
      });

      await this.prisma.$transaction([
        $updateProduct,
        $updateProductTranslation,
        $updateSKUs,
      ]);

      return {
        message: "Product deleted successfully",
      };
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Product not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to delete product.",
      });
    }
  }
}
