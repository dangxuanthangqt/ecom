import { Injectable } from "@nestjs/common";
import {
  Language as LanguageSchema,
  User as UserSchema,
  Product as ProductSchema,
} from "@prisma/client";

import { ErrorCode } from "@/constants/error-codes";
import { ORDER, ORDER_BY } from "@/constants/order";
import { Scope, ScopeType } from "@/constants/permission.constant";
import {
  CreateProductRequestDto,
  ManageProductPaginationQueryDto,
  ProductResponseDto,
  UpdateProductRequestDto,
} from "@/dtos/product/product.dto";
import { ProductRepository } from "@/repositories/product/product.repository";
import { createProductDetailSelect } from "@/selectors/product.selector";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class ManageProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  /**
   * Ownership fence. `scope` comes from the caller's granted permissions (see
   * `@PermissionScope`): `any` may touch every product, `own` only its own.
   * The guard has already admitted the request, so this only narrows it.
   *
   * @throws {HttpException} If the caller's scope is `own` and the product is someone else's.
   */
  private validateOwnership({
    userId: userIdRequest,
    scope,
    createdById,
  }: {
    userId: UserSchema["id"];
    createdById?: UserSchema["id"] | null;
    scope: ScopeType;
  }) {
    if (scope === Scope.OWN && userIdRequest !== createdById) {
      throwHttpException({
        type: "forbidden",
        code: ErrorCode.PRODUCT_FORBIDDEN,
        message: "You do not have permission to interact with this product.",
      });
    }

    return true;
  }

  async getProducts({
    languageId,
    userId,
    scope,
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
      isPublic,
      createdById = userId, // Default to the user's own products
    },
  }: {
    query: ManageProductPaginationQueryDto;
    languageId: LanguageSchema["id"];
    userId: UserSchema["id"];
    scope: ScopeType;
  }) {
    // Validate user permissions
    this.validateOwnership({
      userId,
      scope,
      createdById,
    });

    const skip = (pageIndex - 1) * pageSize;
    const take = pageSize;

    // Normalize order for Prisma
    const normalizedOrder = order.toLowerCase();

    const { products, productsCount } =
      await this.productRepository.findManyProducts(
        {
          query: {
            // -- common filters
            name,
            brandIds,
            categoryIds,
            minPrice,
            maxPrice,

            // -- manage product filters
            isPublic,
            createdById, // Allow user to see their own products
          },
          take,
          skip,
          orderBy: { [orderBy]: normalizedOrder },
        },
        languageId,
      );

    const totalPages = Math.ceil(productsCount / pageSize);

    return {
      // Wrap each row in the response DTO so ClassSerializerInterceptor
      // (excludeExtraneousValues) can actually strip fields — it only
      // applies @Expose() rules to real DTO instances, not plain Prisma rows.
      data: products.map((product) => new ProductResponseDto(product)),
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
    userId,
    scope,
  }: {
    productId: ProductSchema["id"];
    languageId: LanguageSchema["id"];
    userId: UserSchema["id"];
    scope: ScopeType;
  }) {
    const product = await this.productRepository.findUniqueProduct({
      where: { id: productId, deletedAt: null },
      select: {
        ...createProductDetailSelect({ languageId }),
        createdById: true,
      },
    });

    // findUniqueProduct resolves to null for an absent or soft-deleted id;
    // without this guard the permission check below dereferences null and the
    // caller gets a 500 instead of a 404.
    if (!product) {
      throwHttpException({
        type: "notFound",
        code: ErrorCode.PRODUCT_NOT_FOUND,
        message: "Product not found.",
      });
    }

    this.validateOwnership({
      userId,
      scope,
      createdById: product.createdById,
    });

    return product;
  }

  async updateProduct({
    productId,
    data,
    userId,
    scope,
  }: {
    productId: ProductSchema["id"];
    data: UpdateProductRequestDto;
    userId: UserSchema["id"];
    scope: ScopeType;
  }) {
    const { createdById } = await this.productRepository.findUniqueProduct({
      where: { id: productId, deletedAt: null },
      select: {
        createdById: true,
      },
    });

    // Validate client permissions
    this.validateOwnership({
      userId,
      scope,
      createdById,
    });

    // Validate categories
    if (data.categoryIds) {
      await this.productRepository.validateCategories(data.categoryIds);
    }

    const updatedProduct = await this.productRepository.updateProduct({
      productId,
      data,
      userId,
    });

    return updatedProduct;
  }

  async createProduct({
    data: {
      basePrice,
      virtualPrice,
      name,
      brandId,
      images,
      publishedAt,
      categoryIds,
      variants,
      skus,
    },
    userId,
  }: {
    data: CreateProductRequestDto;
    userId: UserSchema["id"];
  }) {
    // Validate categories
    await this.productRepository.validateCategories(categoryIds);

    const product = await this.productRepository.createProduct({
      data: {
        basePrice,
        virtualPrice,
        variants,
        name,
        brandId,
        images,
        publishedAt,
        categories: {
          connect: categoryIds.map((id) => ({
            id,
          })),
        },
        skus: {
          createMany: {
            data: skus.map((sku, index) => ({
              ...sku,
              order: index, // Ensure order is set based on index
            })),
          },
        },
        createdById: userId,
      },
    });

    return product;
  }

  async deleteProduct({
    productId,
    userId,
    scope,
  }: {
    productId: ProductSchema["id"];
    userId: UserSchema["id"];
    scope: ScopeType;
  }) {
    const { createdById } = await this.productRepository.findUniqueProduct({
      where: { id: productId, deletedAt: null },
      select: {
        createdById: true,
      },
    });

    // Validate client permissions
    this.validateOwnership({
      userId,
      scope,
      createdById,
    });

    const result = await this.productRepository.deleteProduct({
      productId,
      userId,
    });

    return result;
  }
}
