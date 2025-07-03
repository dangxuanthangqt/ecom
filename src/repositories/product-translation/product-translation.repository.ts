import { Injectable, Logger } from "@nestjs/common";
import {
  Prisma,
  Product as ProductSchema,
  ProductTranslation as ProductTranslationSchema,
  User as UserSchema,
} from "@prisma/client";

import { productTranslationSelect } from "@/selectors/product-translation.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class ProductTranslationRepository {
  private readonly logger = new Logger(ProductTranslationRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   *
   * Fetches multiple product translations based on the provided criteria.
   * @param where - The filtering criteria for product translations.
   * @param take - The maximum number of product translations to return.
   * @param skip - The number of product translations to skip.
   * @param orderBy - The ordering criteria for the product translations.
   * @returns An object containing the fetched product translations and their count.
   * @throws An error if there is an issue with the database query.
   */
  async findManyProductTranslations({
    where,
    take,
    skip,
    orderBy,
  }: Pick<
    Prisma.ProductTranslationFindManyArgs,
    "where" | "take" | "skip" | "orderBy"
  >) {
    const combinedWhere: Prisma.ProductTranslationWhereInput = {
      ...where,
      deletedAt: null,
    };

    try {
      const $productTranslations =
        this.prismaService.productTranslation.findMany({
          where: combinedWhere,
          take,
          skip,
          orderBy,
          select: productTranslationSelect,
        });

      const $productTranslationsCount =
        this.prismaService.productTranslation.count({
          where: combinedWhere,
        });

      const [productTranslationsCount, productTranslations] = await Promise.all(
        [$productTranslationsCount, $productTranslations],
      );

      return { productTranslations, productTranslationsCount };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "An error occurred while fetching product translations.",
      });
    }
  }

  /**
   *
   * @param id - The ID of the product translation to fetch.
   * @returns The product translation object if found.
   * @throws An error if the product translation is not found or if there is a database
   *         error while fetching it.
   */
  async findProductTranslationById(id: ProductTranslationSchema["id"]) {
    try {
      const productTranslation =
        await this.prismaService.productTranslation.findUniqueOrThrow({
          where: { id, deletedAt: null },
          select: productTranslationSelect,
        });

      return productTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Product translation not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "An error occurred while fetching the product translation.",
      });
    }
  }

  /**
   *
   * @param id - The ID of the product to validate.
   * @returns The validated product object if found.
   * @throws An error if the product is not found or if there is a database error
   *         while validating it.
   */
  async validateProduct(id: ProductSchema["id"]) {
    try {
      const product = await this.prismaService.product.findUniqueOrThrow({
        where: { id, deletedAt: null },
        select: { id: true },
      });

      return product;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Product with ID ${id} not found.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to validate product with ID ${id}.`,
      });
    }
  }

  /**
   * Creates a new product translation.
   *
   * @param data - The data for the new product translation.
   * @returns The created product translation object.
   * @throws An error if there is a database error while creating the product translation.
   */
  async createProductTranslation({
    data,
  }: {
    data: Prisma.ProductTranslationCreateArgs["data"];
  }) {
    try {
      const productTranslation =
        await this.prismaService.productTranslation.create({
          data,
          select: productTranslationSelect,
        });

      return productTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Product translation not found.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Invalid foreign key reference in product translation.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create product translation.",
      });
    }
  }

  /**
   * Updates an existing product translation.
   *
   * @param id - The ID of the product translation to update.
   * @param data - The data to update the product translation with.
   * @returns The updated product translation object.
   * @throws An error if there is a database error while updating the product translation.
   */
  async updateProductTranslation({
    id,
    data,
  }: {
    id: ProductTranslationSchema["id"];
    data: Prisma.ProductTranslationUpdateArgs["data"];
  }) {
    try {
      const productTranslation =
        await this.prismaService.productTranslation.update({
          where: { id, deletedAt: null },
          data,
          select: productTranslationSelect,
        });

      return productTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message:
            "Product translation with this product and language already exists.",
        });
      }

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Product translation with ID ${id} not found.`,
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Invalid foreign key reference in product translation.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update product translation.",
      });
    }
  }

  /**
   * Deletes a product translation by its ID.
   *
   * @param id - The ID of the product translation to delete.
   * @returns The deleted product translation object.
   * @throws An error if there is a database error while deleting the product translation.
   */
  async deleteProductTranslation({
    userId,
    id,
  }: {
    id: ProductTranslationSchema["id"];
    userId: UserSchema["id"];
  }) {
    try {
      const productTranslation =
        await this.prismaService.productTranslation.update({
          where: { id, deletedAt: null },
          data: {
            deletedAt: new Date(),
            deletedById: userId,
            updatedById: userId,
          },
          select: productTranslationSelect,
        });

      return productTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Product translation with ID ${id} not found.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to delete product translation with ID ${id}.`,
      });
    }
  }
}
