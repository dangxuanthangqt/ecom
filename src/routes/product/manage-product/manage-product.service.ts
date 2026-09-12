import { Injectable } from "@nestjs/common";
import {
  Language as LanguageSchema,
  Role as RoleSchema,
  User as UserSchema,
  Product as ProductSchema,
} from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import { Role } from "@/constants/role.constant";
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
   * Validates if the user has permission to manage a product.
   * @param userId - The ID of the user attempting to manage the product.
   * @param roleName - The role of the user.
   * @param createdById - The ID of the user who created the product.
   * @throws {HttpException} If the user does not have permission.
   */
  private validateClientPermission({
    userId: userIdRequest,
    roleName: roleNameRequest,
    createdById,
  }: {
    userId: UserSchema["id"];
    createdById?: UserSchema["id"] | null;
    roleName: RoleSchema["name"];
  }) {
    if (userIdRequest !== createdById && roleNameRequest !== Role.ADMIN) {
      throwHttpException({
        type: "forbidden",
        message: "You do not have permission to interact with this product.",
      });
    }

    return true;
  }

  async getProducts({
    languageId,
    userId,
    roleName,
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
    roleName: RoleSchema["name"];
  }) {
    // Validate user permissions
    this.validateClientPermission({
      userId,
      roleName,
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
    roleName,
  }: {
    productId: ProductSchema["id"];
    languageId: LanguageSchema["id"];
    userId: UserSchema["id"];
    roleName: RoleSchema["name"];
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
        message: "Product not found.",
      });
    }

    this.validateClientPermission({
      userId,
      roleName,
      createdById: product.createdById,
    });

    return product;
  }

  async updateProduct({
    productId,
    data,
    userId,
    roleName,
  }: {
    productId: ProductSchema["id"];
    data: UpdateProductRequestDto;
    userId: UserSchema["id"];
    roleName: RoleSchema["name"];
  }) {
    const { createdById } = await this.productRepository.findUniqueProduct({
      where: { id: productId, deletedAt: null },
      select: {
        createdById: true,
      },
    });

    // Validate client permissions
    this.validateClientPermission({
      userId,
      roleName,
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
    roleName,
  }: {
    productId: ProductSchema["id"];
    userId: UserSchema["id"];
    roleName: RoleSchema["name"];
  }) {
    const { createdById } = await this.productRepository.findUniqueProduct({
      where: { id: productId, deletedAt: null },
      select: {
        createdById: true,
      },
    });

    // Validate client permissions
    this.validateClientPermission({
      userId,
      roleName,
      createdById,
    });

    const result = await this.productRepository.deleteProduct({
      productId,
      userId,
    });

    return result;
  }
}
