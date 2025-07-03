import { Injectable } from "@nestjs/common";
import {
  BrandTranslation as BrandTranslationSchema,
  User as UserSchema,
} from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import {
  BrandTranslationRequestDto,
  UpdateBrandTranslationRequestDto,
} from "@/dtos/brand-translation/brand-translation.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { BrandTranslationRepository } from "@/repositories/brand-translation/brand-translation.repository";

@Injectable()
export class BrandTranslationService {
  constructor(
    private readonly brandTranslationRepository: BrandTranslationRepository,
  ) {}

  async createBrandTranslation({
    data,
    userId,
  }: {
    data: BrandTranslationRequestDto;
    userId: UserSchema["id"];
  }) {
    // Validate the brand before creating the translation
    await this.brandTranslationRepository.validateBrand(data.brandId);

    const result = this.brandTranslationRepository.createBrandTranslation({
      data: {
        ...data,
        createdById: userId,
      },
    });

    return result;
  }

  async getBrandTranslationById(id: BrandTranslationSchema["id"]) {
    const result =
      await this.brandTranslationRepository.findUniqueBrandTranslation(id);

    return result;
  }

  async getBrandTranslations({
    pageIndex = 1,
    pageSize = 10,
    order = ORDER.ASC,
    orderBy = ORDER_BY.CREATED_AT,
    keyword = "",
  }: PaginationQueryDto) {
    {
      const skip = (pageIndex - 1) * pageSize;
      const take = pageSize;

      // Normalize order for Prisma
      const normalizedOrder = order.toLowerCase();

      const { brandTranslations, brandTranslationsCount } =
        await this.brandTranslationRepository.findManyBrandTranslations({
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

      const totalPages = Math.ceil(brandTranslationsCount / pageSize);

      return {
        data: brandTranslations,
        pagination: {
          pageIndex,
          pageSize,
          totalPages,
          totalItems: brandTranslationsCount,
        },
      };
    }
  }

  async updateBrandTranslation({
    id,
    data,
    userId,
  }: {
    id: BrandTranslationSchema["id"];
    data: UpdateBrandTranslationRequestDto;
    userId: UserSchema["id"];
  }) {
    // Validate the brand and language IDs before updating the translation
    if (data.brandId) {
      await this.brandTranslationRepository.validateBrand(data.brandId);
    }

    const result = this.brandTranslationRepository.updateBrandTranslation({
      id,
      data: {
        ...data,
        updatedById: userId,
      },
    });

    return result;
  }

  async deleteBrandTranslation({
    id,
    userId,
  }: {
    id: BrandTranslationSchema["id"];
    userId: UserSchema["id"];
  }) {
    const result = await this.brandTranslationRepository.deleteBrandTranslation(
      {
        id,
        userId,
      },
    );

    return result;
  }
}
