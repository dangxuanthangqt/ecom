import { Injectable, Logger } from "@nestjs/common";
import {
  Category as CategorySchema,
  CategoryTranslation as CategoryTranslationSchema,
  Language as LanguageSchema,
  User as UserSchema,
  Prisma,
} from "@prisma/client";

import { createCategoryWithTranslationsSelect } from "@/selectors/category.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class CategoryRepository {
  private logger = new Logger(CategoryRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Fetches all categories, optionally filtered by language and parent category.
   *
   * @param languageId - Optional language identifier to include specific language translations.
   * @param parentCategoryId - Optional parent category identifier to filter categories.
   * @returns An array of categories with their translations.
   */
  async findAllCategories({
    languageId,
    parentCategoryId,
  }: {
    languageId?: LanguageSchema["id"];
    parentCategoryId?: CategorySchema["id"];
  } = {}) {
    try {
      const combinedWhere: Prisma.CategoryWhereInput = {
        deletedAt: null,
        parentCategoryId, // Filter by parent category if provided
      };

      return this.prismaService.category.findMany({
        where: combinedWhere,
        orderBy: { createdAt: "desc" },
        select: createCategoryWithTranslationsSelect({ languageId }),
      });
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch categories",
      });
    }
  }

  /**
   * Fetches a single category by its ID, including its translations in the specified language.
   *
   * @param id - The unique identifier of the category to fetch.
   * @param languageId - Optional language identifier to include specific language translations.
   * @returns A promise that resolves to the category with its translations, or throws an error if not found.
   * @throws {HttpException} Throws a not found error if the category does not exist, or an internal error if the database operation fails.
   */
  async findCategoryById({
    id,
    languageId,
  }: {
    id: CategorySchema["id"];
    languageId?: LanguageSchema["id"];
  }) {
    try {
      const category = await this.prismaService.category.findUniqueOrThrow({
        where: { id, deletedAt: null },
        select: createCategoryWithTranslationsSelect({ languageId }),
      });

      return category;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Category not found",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to fetch category by ID",
      });
    }
  }

  private async validateCategoryTranslations(
    categoryTranslations: CategoryTranslationSchema["id"][],
  ) {
    const existingTranslations =
      await this.prismaService.categoryTranslation.findMany({
        where: {
          id: { in: categoryTranslations },
          deletedAt: null,
        },
      });

    if (existingTranslations.length !== categoryTranslations.length) {
      throwHttpException({
        type: "badRequest",
        message: "Some category translations do not exist.",
      });
    }
  }

  /**
   * Creates a new category with the provided data and associated translations.
   *
   * @param data - The data for the new category.
   * @param categoryTranslationIds - An array of category translation IDs to associate with the new category.
   * @returns The created category with its translations.
   * @throws {HttpException} Throws an error if the creation fails due to unique constraint violations or foreign key constraints.
   */
  async createCategory({
    data,
    categoryTranslationIds,
  }: {
    data: Prisma.CategoryCreateArgs["data"];
    categoryTranslationIds?: CategoryTranslationSchema["id"][];
  }) {
    if (categoryTranslationIds && categoryTranslationIds.length) {
      await this.validateCategoryTranslations(categoryTranslationIds);
    }

    try {
      const category = await this.prismaService.category.create({
        data: {
          ...data,
          categoryTranslations: {
            connect: categoryTranslationIds?.map((id) => ({ id })),
          },
        },
        select: createCategoryWithTranslationsSelect(),
      });

      return category;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Category is already exists.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Failed to create category due to foreign key constraint.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create category",
      });
    }
  }

  /**
   * Updates an existing category by its ID with the provided data and associated translations.
   *
   * @param id - The unique identifier of the category to update.
   * @param data - The data to update the category with.
   * @param categoryTranslationIds - An optional array of category translation IDs to associate with the updated category.
   * @returns The updated category with its translations.
   * @throws {HttpException} Throws an error if the update fails due to record not found, unique constraint violations, or other issues.
   */
  async updateCategory({
    id,
    data,
    categoryTranslationIds,
  }: {
    id: CategorySchema["id"];
    data: Prisma.CategoryUpdateArgs["data"];
    categoryTranslationIds?: CategoryTranslationSchema["id"][];
  }) {
    if (categoryTranslationIds && categoryTranslationIds.length > 0) {
      await this.validateCategoryTranslations(categoryTranslationIds);
    }

    // Prevent circular reference where a category is its own parent
    if (id === data.parentCategoryId) {
      throwHttpException({
        type: "unprocessable",
        message: "A category cannot be its own parent.",
      });
    }

    try {
      const category = await this.prismaService.category.update({
        where: { id, deletedAt: null },
        data: {
          ...data,
          categoryTranslations: {
            connect: categoryTranslationIds?.map((id) => ({ id })),
          },
        },
        select: createCategoryWithTranslationsSelect(),
      });

      return category;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Category not found",
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Category with this name already exists.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update category",
      });
    }
  }

  /**
   * Deletes a category by its ID, marking it as deleted.
   *
   * @param id - The ID of the category to delete.
   * @returns The updated category object with the deletedAt timestamp.
   * @throws {HttpException} Throws a not found error if the category does not exist, or an internal error if the deletion fails.
   */
  async deleteCategory({
    id,
    userId,
  }: {
    id: CategorySchema["id"];
    userId: UserSchema["id"];
  }) {
    try {
      const category = await this.prismaService.category.update({
        where: { id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          updatedById: userId,
          deletedById: userId,
        },
        select: createCategoryWithTranslationsSelect(),
      });

      return category;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Category not found",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to delete category",
      });
    }
  }
}
