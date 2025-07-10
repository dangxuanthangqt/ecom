import { Injectable } from "@nestjs/common";
import {
  Language as LanguageSchema,
  Prisma,
  Product as ProductSchema,
} from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import { ProductOrderByFields } from "@/dtos/product/constant";
import { ProductPaginationQueryDto } from "@/dtos/product/product.dto";
import { ProductRepository } from "@/repositories/product/product.repository";
import { createProductSelect } from "@/selectors/product.selector";

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async getProducts({
    query: {
      pageIndex = 1,
      pageSize = 10,
      order = ORDER.ASC,
      orderBy = ORDER_BY.CREATED_AT,
      name,
      brandIds,
      categoryIds,
      minPrice,
      maxPrice,
    },
    languageId,
  }: {
    query: ProductPaginationQueryDto;
    languageId: LanguageSchema["id"];
  }) {
    const skip = (pageIndex - 1) * pageSize;
    const take = pageSize;

    let composedOrderBy: Prisma.ProductOrderByWithRelationInput = {
      [orderBy]: order,
    };

    if (orderBy === ProductOrderByFields.SALE) {
      composedOrderBy = {
        orders: {
          _count: order,
        },
      };
    }

    const { products, productsCount } =
      await this.productRepository.findManyProducts(
        {
          query: {
            name,
            brandIds,
            categoryIds,
            minPrice,
            maxPrice,
            isPublic: true, // Only public products
          },
          take,
          skip,
          orderBy: composedOrderBy,
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

  async getProductById({
    productId,
    languageId,
  }: {
    productId: ProductSchema["id"];
    languageId: LanguageSchema["id"];
  }) {
    const product = await this.productRepository.findUniqueProduct({
      where: {
        id: productId,
        deletedAt: null,
        publishedAt: { lte: new Date(), not: null },
      },
      select: createProductSelect({
        languageId,
      }),
    });

    return product;
  }
}
