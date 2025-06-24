import { Injectable } from "@nestjs/common";
import {
  Category as CategorySchema,
  Language as LanguageSchema,
  User as UserSchema,
} from "@prisma/client";

import {
  CreateCategoryRequestDto,
  UpdateCategoryRequestDto,
} from "@/dtos/category/category.dto";
import { CategoryRepository } from "@/repositories/category/category.repository";

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  /**
   * Retrieves all categories, optionally filtered by language and parent category.
   *
   * @param languageId - Optional language identifier to include specific language translations.
   * @param parentCategoryId - Optional parent category identifier to filter categories.
   * @returns An array of categories with their translations.
   */
  async getAllCategories({
    languageId,
    parentCategoryId,
  }: {
    languageId?: LanguageSchema["id"];
    parentCategoryId?: CategorySchema["id"];
  }) {
    const categories = await this.categoryRepository.findAllCategories({
      languageId,
      parentCategoryId,
    });

    return categories;
  }

  /**
   * Retrieves a single category by its ID, including its translations in the specified language.
   *
   * @param id - The unique identifier of the category to fetch.
   * @param languageId - Optional language identifier to include specific language translations.
   * @returns The category with its translations.
   */
  async getCategoryById({
    id,
    languageId,
  }: {
    id: CategorySchema["id"];
    languageId?: LanguageSchema["id"];
  }) {
    const category = await this.categoryRepository.findCategoryById({
      id,
      languageId,
    });

    return category;
  }

  /**
   * Creates a new category with the provided data and associates it with the user.
   * @param body - The data for the new category, including optional translations.
   * @param userId - The ID of the user creating the category.
   * @returns The created category object.
   * @throws {HttpException} Throws an internal error if the database operation fails.
   */
  async createCategory({
    body: { categoryTranslationIds, ...rest },
    userId,
  }: {
    body: CreateCategoryRequestDto;
    userId: UserSchema["id"];
  }) {
    const category = await this.categoryRepository.createCategory({
      data: {
        ...rest,
        createdById: userId,
      },
      categoryTranslationIds,
    });

    return category;
  }

  /**
   * Updates an existing category by its ID, including its translations.
   *
   * @param id - The ID of the category to update.
   * @param body - The data to update the category with.
   * @param userId - The ID of the user performing the update.
   * @returns The updated category object.
   */
  async updateCategory({
    id,
    body: { categoryTranslationIds, ...rest },
    userId,
  }: {
    id: CategorySchema["id"];
    body: UpdateCategoryRequestDto;
    userId: UserSchema["id"];
  }) {
    const category = await this.categoryRepository.updateCategory({
      id,
      data: {
        ...rest,
        updatedById: userId,
      },
      categoryTranslationIds,
    });

    return category;
  }

  /**
   * Deletes a category by its ID.
   *
   * @param id - The ID of the category to delete.
   * @returns The deleted category object.
   */
  async deleteCategory({
    id,
    userId,
  }: {
    id: CategorySchema["id"];
    userId: UserSchema["id"];
  }) {
    const category = await this.categoryRepository.deleteCategory({
      id,
      userId,
    });
    return category;
  }
}
