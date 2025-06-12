import { Injectable } from "@nestjs/common";
import { Brand as BrandSchema, User as UserSchema } from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import {
  CreateBrandRequestDto,
  UpdateBrandRequestDto,
} from "@/dtos/brand/brand.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { BrandRepository } from "@/repositories/brand/brand.repository";

@Injectable()
export class BrandService {
  constructor(private readonly brandRepository: BrandRepository) {}

  async getBrands({
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

    const { brands, brandsCount } = await this.brandRepository.findManyBrands({
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

    const totalPages = Math.ceil(brandsCount / pageSize);

    return {
      data: brands,
      pagination: {
        pageIndex,
        pageSize,
        totalPages,
        totalItems: brandsCount,
      },
    };
  }

  async getBrandById(id: BrandSchema["id"]) {
    const brand = await this.brandRepository.findUniqueBrand(id);

    return brand;
  }

  async createBrand({
    body: { logo, name, brandTranslationIds },
    userId,
  }: {
    body: CreateBrandRequestDto;
    userId: BrandSchema["id"];
  }) {
    const brand = await this.brandRepository.createBrand({
      data: {
        name,
        logo,
        createdById: userId, // Set createdById to the current user
      },
      brandTranslationIds,
    });

    return brand;
  }

  async updateBrand({
    id,
    userId,
    body,
  }: {
    id: BrandSchema["id"];
    userId: UserSchema["id"];
    body: UpdateBrandRequestDto;
  }) {
    const brand = await this.brandRepository.updateBrand({
      id,
      data: {
        ...body,
        updatedById: userId, // Set updatedById to the current user
      },
    });

    return brand;
  }

  async deleteBrand({
    id,
    userId,
    isHardDelete = false,
  }: {
    id: BrandSchema["id"];
    userId: UserSchema["id"];
    isHardDelete?: boolean;
  }) {
    const brand = await this.brandRepository.deleteBrand({
      id,
      userId,
      isHardDelete,
    });

    return brand;
  }
}
