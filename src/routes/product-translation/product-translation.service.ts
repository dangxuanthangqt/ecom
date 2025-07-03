import { Injectable } from "@nestjs/common";
import {
  ProductTranslation as ProductTranslationSchema,
  User as UserSchema,
} from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import {
  CreateProductTranslationRequestDto,
  UpdateProductTranslationRequestDto,
} from "@/dtos/product-translation/product-translation.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { ProductTranslationRepository } from "@/repositories/product-translation/product-translation.repository";

@Injectable()
export class ProductTranslationService {
  constructor(
    private readonly productTranslationRepository: ProductTranslationRepository,
  ) {}

  async getProductTranslations({
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

    const { productTranslations, productTranslationsCount } =
      await this.productTranslationRepository.findManyProductTranslations({
        where: {
          name: {
            contains: keyword,
            mode: "insensitive", // Không phân biệt hoa/thường
          },
        },
        take,
        skip,
        orderBy: { [orderBy]: normalizedOrder },
      });

    const totalPages = Math.ceil(productTranslationsCount / pageSize);

    return {
      data: productTranslations,
      pagination: {
        pageIndex,
        pageSize,
        totalPages,
        totalItems: productTranslationsCount,
      },
    };
  }

  async createProductTranslation({
    data,
    userId,
  }: {
    data: CreateProductTranslationRequestDto;
    userId: UserSchema["id"];
  }) {
    // Validate the product before creating the translation
    await this.productTranslationRepository.validateProduct(data.productId);

    const result = this.productTranslationRepository.createProductTranslation({
      data: {
        ...data,
        createdById: userId,
      },
    });

    return result;
  }

  async getProductTranslationById(id: ProductTranslationSchema["id"]) {
    const result =
      await this.productTranslationRepository.findProductTranslationById(id);

    return result;
  }

  async updateProductTranslation({
    id,
    data,
    userId,
  }: {
    id: ProductTranslationSchema["id"];
    data: UpdateProductTranslationRequestDto;
    userId: UserSchema["id"];
  }) {
    // Validate the product before updating the translation
    if (data.productId) {
      await this.productTranslationRepository.validateProduct(data.productId);
    }

    const result = this.productTranslationRepository.updateProductTranslation({
      id,
      data: {
        ...data,
        updatedById: userId,
      },
    });

    return result;
  }

  async deleteProductTranslation({
    id,
    userId,
  }: {
    id: ProductTranslationSchema["id"];
    userId: UserSchema["id"];
  }) {
    const result =
      await this.productTranslationRepository.deleteProductTranslation({
        id,
        userId,
      });

    return result;
  }
}
