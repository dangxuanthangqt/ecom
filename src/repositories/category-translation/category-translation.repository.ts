import { Injectable, Logger } from "@nestjs/common";
import {
  Category as CategorySchema,
  CategoryTranslation as CategoryTranslationSchema,
  Prisma,
  User as UserSchema,
} from "@prisma/client";

import { categoryTranslationSelect } from "@/selectors/category-translation.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class CategoryTranslationRepository {
  private logger = new Logger(CategoryTranslationRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Fetches multiple category translations based on the provided criteria.
   *
   * @param where - The filtering criteria for category translations.
   * @param take - The maximum number of category translations to return.
   * @param skip - The number of category translations to skip.
   * @param orderBy - The ordering criteria for the category translations.
   * @returns An object containing the fetched category translations and their count.
   */
  async findManyCategoryTranslations({
    where,
    take,
    skip,
    orderBy,
  }: Pick<
    Prisma.CategoryTranslationFindManyArgs,
    "where" | "take" | "skip" | "orderBy"
  >) {
    const combinedWhere: Prisma.CategoryTranslationWhereInput = {
      ...where,
      deletedAt: null,
    };

    try {
      const $categoryTranslations =
        this.prismaService.categoryTranslation.findMany({
          where: combinedWhere,
          take,
          skip,
          orderBy,
          select: categoryTranslationSelect,
        });

      const $categoryTranslationsCount =
        this.prismaService.categoryTranslation.count({
          where: combinedWhere,
        });

      const [categoryTranslations, categoryTranslationsCount] =
        await Promise.all([$categoryTranslations, $categoryTranslationsCount]);

      return {
        categoryTranslations,
        categoryTranslationsCount,
      };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch category translations",
      });
    }
  }

  /**
   * Fetches a single category translation by its ID.
   *
   * @param id - The unique identifier of the category translation to fetch.
   * @returns The category translation object.
   * @throws {HttpException} Throws a not found error if the category translation does not exist, or an internal error if the database operation fails.
   */
  async findUniqueCategoryTranslation(id: CategoryTranslationSchema["id"]) {
    try {
      const categoryTranslation =
        await this.prismaService.categoryTranslation.findUniqueOrThrow({
          where: { id, deletedAt: null },
          select: categoryTranslationSelect,
        });

      return categoryTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Category translation not found",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to fetch category translation",
      });
    }
  }

  /**
   * @param id - The ID of the category translation to validate.
   * @returns The validated category translation object.
   * @throws {HttpException} Throws a not found error if the category translation does not exist, or an internal error if the database operation fails.
   */
  async validateCategory(id: CategorySchema["id"]) {
    try {
      const category = await this.prismaService.category.findUniqueOrThrow({
        where: { id, deletedAt: null },
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
        message: "Failed to validate category",
      });
    }
  }

  /**
   * Creates a new category translation with the provided data.
   *
   * @param data - The data for the new category translation.
   * @returns The created category translation object.
   * @throws {HttpException} Throws an internal error if the database operation fails.
   */
  async createCategoryTranslation({
    data,
  }: {
    data: Prisma.CategoryTranslationCreateArgs["data"];
  }) {
    try {
      const categoryTranslation =
        await this.prismaService.categoryTranslation.create({
          data,
          select: categoryTranslationSelect,
        });

      return categoryTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Category translation with this name already exists.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message:
            "Failed to create category translation due to foreign key constraint.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create category translation",
      });
    }
  }

  /**
   * Updates an existing category translation by its ID.
   *
   * @param id - The ID of the category translation to update.
   * @param data - The data to update the category translation with.
   * @returns The updated category translation object.
   * @throws {HttpException} Throws a not found error if the category translation does not exist, or an internal error if the database operation fails.
   */
  async updateCategoryTranslation({
    id,
    data,
  }: {
    id: CategoryTranslationSchema["id"];
    data: Prisma.CategoryTranslationUpdateArgs["data"];
  }) {
    try {
      const categoryTranslation =
        await this.prismaService.categoryTranslation.update({
          where: { id, deletedAt: null },
          data,
          select: categoryTranslationSelect,
        });

      return categoryTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Category translation not found.",
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Category translation with this name already exists.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message:
            "Failed to update category translation due to foreign key constraint.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update category translation",
      });
    }
  }

  /**
   * Deletes a category translation by its ID.
   *
   * @param id - The ID of the category translation to delete.
   * @returns The deleted category translation object.
   * @throws {HttpException} Throws a not found error if the category translation does not exist, or an internal error if the database operation fails.
   */
  async deleteCategoryTranslation({
    id,
    userId,
  }: {
    userId: UserSchema["id"];
    id: CategoryTranslationSchema["id"];
  }) {
    try {
      const categoryTranslation =
        await this.prismaService.categoryTranslation.update({
          where: { id, deletedAt: null },
          data: {
            deletedAt: new Date(),
            deletedById: userId,
            updatedById: userId,
          },
          select: categoryTranslationSelect,
        });

      return categoryTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Category translation not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to delete category translation",
      });
    }
  }
}
