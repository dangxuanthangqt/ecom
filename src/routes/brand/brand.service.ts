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

  /**
   * Retrieves a paginated list of brands with optional filtering and sorting.
   *
   * @param pageIndex - The current page index (default is 1).
   * @param pageSize - The number of items per page (default is 10).
   * @param order - The order direction (ASC or DESC, default is ASC).
   * @param orderBy - The field to order by (default is createdAt).
   * @param keyword - A keyword to filter brands by name (default is an empty string).
   * @returns An object containing the paginated list of brands and pagination metadata.
   */
  async getBrands(
    {
      pageIndex = 1,
      pageSize = 10,
      order = ORDER.ASC,
      orderBy = ORDER_BY.CREATED_AT,
      keyword = "",
    }: PaginationQueryDto,
    languageId: string,
  ) {
    const skip = (pageIndex - 1) * pageSize;
    const take = pageSize;

    // Normalize order for Prisma
    const normalizedOrder = order.toLowerCase();

    const { brands, brandsCount } = await this.brandRepository.findManyBrands(
      {
        where: {
          name: {
            contains: keyword,
            mode: "insensitive", // ← Không phân biệt hoa/thường
          },
        },
        take,
        skip,
        orderBy: { [orderBy]: normalizedOrder },
      },
      languageId,
    );

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

  /**
   * Retrieves a brand by its ID.
   *
   * @param id - The ID of the brand to retrieve.
   * @returns The brand object if found, or null if not found.
   */
  async getBrandById(id: BrandSchema["id"], languageId: string) {
    const brand = await this.brandRepository.findUniqueBrand(id, languageId);

    return brand;
  }

  /**
   * Retrieves a brand by its name.
   *
   * @param name - The name of the brand to retrieve.
   * @returns The brand object if found, or null if not found.
   */
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

  /**
   * Updates an existing brand by its ID.
   *
   * @param id - The ID of the brand to update.
   * @param userId - The ID of the user performing the update.
   * @param body - The data to update the brand with.
   * @returns The updated brand object.
   */
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

  /**
   * Deletes a brand by its ID.
   *
   * @param id - The ID of the brand to delete.
   * @param userId - The ID of the user performing the deletion.
   * @param isHardDelete - Whether to perform a hard delete (true) or soft delete (false).
   * @returns The deleted brand object.
   */
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
