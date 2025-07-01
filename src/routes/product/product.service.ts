import { Injectable } from "@nestjs/common";
import {
  Language as LanguageSchema,
  Product as ProductSchema,
  User as UserSchema,
} from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import { CreateProductRequestDto } from "@/dtos/product/product.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { ProductRepository } from "@/repositories/product/product.repository";

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async findManyProducts(
    {
      pageIndex = 1,
      pageSize = 10,
      order = ORDER.ASC,
      orderBy = ORDER_BY.CREATED_AT,
      keyword = "",
    }: PaginationQueryDto,
    languageId: LanguageSchema["id"],
  ) {
    const skip = (pageIndex - 1) * pageSize;
    const take = pageSize;

    // Normalize order for Prisma
    const normalizedOrder = order.toLowerCase();

    const { products, productsCount } =
      await this.productRepository.findManyProducts(
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

    const totalPages = Math.ceil(productsCount / pageSize);

    return {
      data: products,
      pagination: {
        pageIndex,
        pageSize,
        totalItems: productsCount,
        totalPages,
      },
    };
  }

  async findUniqueProduct({
    id,
    languageId,
  }: {
    id: ProductSchema["id"];
    languageId: LanguageSchema["id"];
  }) {
    const product = await this.productRepository.findUniqueProduct({
      id,
      languageId,
    });

    return product;
  }

  async createProduct({
    data: {
      basePrice,
      virtualPrice,
      name,
      brandId,
      images,
      publishAt,
      categoryIds,
      variants,
      skus,
    },
    userId,
  }: {
    data: CreateProductRequestDto;
    userId: UserSchema["id"];
  }) {
    const product = await this.productRepository.createProduct({
      data: {
        basePrice,
        virtualPrice,
        variants,
        name,
        brandId,
        images,
        publishAt,
        categories: {
          connect: categoryIds.map((id) => ({
            id,
          })),
        },
        skus: {
          createMany: {
            data: skus,
          },
        },
        createdById: userId,
      },
    });

    return product;
  }

  async deleteProduct({
    id,
    userId,
  }: {
    id: ProductSchema["id"];
    userId: UserSchema["id"];
  }) {
    const result = await this.productRepository.deleteProduct({
      id,
      userId,
    });

    return result;
  }
}
