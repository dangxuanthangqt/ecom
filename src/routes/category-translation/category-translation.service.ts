import { Injectable } from "@nestjs/common";
import {
  CategoryTranslation as CategoryTranslationSchema,
  User as UserSchema,
} from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import {
  CreateCategoryTranslationRequestDto,
  UpdateCategoryTranslationRequestDto,
} from "@/dtos/category-translation/category-translation.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { CategoryTranslationRepository } from "@/repositories/category-translation/category-translation.repository";

@Injectable()
export class CategoryTranslationService {
  constructor(
    private readonly categoryTranslationRepository: CategoryTranslationRepository,
  ) {}

  async getCategoryTranslations({
    pageIndex = 1,
    pageSize = 10,
    order = ORDER.ASC,
    orderBy = ORDER_BY.CREATED_AT,
    keyword = "",
  }: PaginationQueryDto) {
    const skip = (pageIndex - 1) * pageSize;
    const take = pageSize;
    // Normalize order for Prisma
    const normalizedOrder = order.toLowerCase();

    const { categoryTranslations, categoryTranslationsCount } =
      await this.categoryTranslationRepository.findManyCategoryTranslations({
        where: {
          name: {
            contains: keyword,
            mode: "insensitive", // ← Không phân biệt hoa/thường
          },
        },
        take,
        skip,
        orderBy: { [orderBy]: normalizedOrder },
      });

    const totalPages = Math.ceil(categoryTranslationsCount / pageSize);

    return {
      data: categoryTranslations,
      pagination: {
        pageIndex,
        pageSize,
        totalPages,
        totalItems: categoryTranslationsCount,
      },
    };
  }

  async getCategoryTranslationById(id: CategoryTranslationSchema["id"]) {
    const result =
      await this.categoryTranslationRepository.findUniqueCategoryTranslation(
        id,
      );

    return result;
  }

  async createCategoryTranslation({
    data,
    userId,
  }: {
    data: CreateCategoryTranslationRequestDto;
    userId: string;
  }) {
    await this.categoryTranslationRepository.validateCategory(data.categoryId);

    const result =
      await this.categoryTranslationRepository.createCategoryTranslation({
        data: {
          ...data,
          createdById: userId,
        },
      });

    return result;
  }

  async updateCategoryTranslation({
    id,
    data,
    userId,
  }: {
    id: CategoryTranslationSchema["id"];
    data: UpdateCategoryTranslationRequestDto;
    userId: UserSchema["id"];
  }) {
    // Validate the category before updating the translation
    if (data.categoryId) {
      await this.categoryTranslationRepository.validateCategory(
        data.categoryId,
      );
    }

    const result =
      await this.categoryTranslationRepository.updateCategoryTranslation({
        id,
        data: {
          ...data,
          updatedById: userId,
        },
      });

    return result;
  }

  async deleteCategoryTranslation({
    id,
    userId,
  }: {
    id: CategoryTranslationSchema["id"];
    userId: UserSchema["id"];
  }) {
    const result =
      await this.categoryTranslationRepository.deleteCategoryTranslation({
        id,
        userId,
      });

    return result;
  }
}
