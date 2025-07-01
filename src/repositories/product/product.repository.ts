import { Injectable, Logger } from "@nestjs/common";
import {
  Language as LanguageSchema,
  Prisma,
  Product as ProductSchema,
  User as UserSchema,
} from "@prisma/client";

import { categorySelect } from "@/selectors/category.selector";
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
   * Fetches a list of products with pagination and filtering options.
   * @param where - Filter conditions for the products.
   * @param take - Number of products to return.
   * @param skip - Number of products to skip (for pagination).
   * @param orderBy - Sorting options for the products.
   * @param languageId - The ID of the language for product translations.
   * @returns An object containing the list of products and the total count.
   * @throws Throws an HTTP exception if the operation fails.
   */
  async findManyProducts(
    {
      where,
      take,
      skip,
      orderBy,
    }: Pick<Prisma.ProductFindManyArgs, "where" | "take" | "skip" | "orderBy">,
    languageId: LanguageSchema["id"],
  ) {
    try {
      const combinedWhere: Prisma.ProductWhereInput = {
        ...where,
        deletedAt: null,
      };

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
   * Finds a unique product by ID with localized content and associated categories.
   *
   * @param params - The parameters for finding the product
   * @param params.id - The unique identifier of the product
   * @param params.languageId - The language ID for localized content
   * @returns Promise that resolves to the product with localized content and categories
   * @throws {HttpException} Throws a 404 "notFound" exception if the product is not found
   * @throws {HttpException} Throws a 500 "internal" exception if the database operation fails
   */
  async findUniqueProduct({
    id,
    languageId,
  }: {
    id: ProductSchema["id"];
    languageId: LanguageSchema["id"];
  }) {
    try {
      const product = await this.prisma.product.findUniqueOrThrow({
        where: { id, deletedAt: null },
        select: {
          ...createProductSelect({ languageId }),
          categories: {
            where: { deletedAt: null },
            select: categorySelect,
          },
        },
      });

      return product;
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

  async createProduct({ data }: { data: Prisma.ProductCreateArgs["data"] }) {
    try {
      const product = await this.prisma.product.create({
        data,
        select: {
          ...createProductSelect(),
          categories: {
            where: { deletedAt: null },
            select: categorySelect,
          },
        },
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

  async deleteProduct({
    id,
    userId,
  }: {
    id: ProductSchema["id"];
    userId: UserSchema["id"];
  }) {
    try {
      const $updateProduct = this.prisma.product.update({
        where: { id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          updatedById: userId,
          deletedById: userId,
        },
      });

      const $updateSKUs = this.prisma.sKU.updateMany({
        where: { productId: id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          updatedById: userId,
          deletedById: userId,
        },
      });

      await this.prisma.$transaction([$updateProduct, $updateSKUs]);

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
