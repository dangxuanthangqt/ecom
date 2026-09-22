import { Injectable } from "@nestjs/common";
import {
  Prisma,
  ProductTranslation as ProductTranslationSchema,
  User as UserSchema,
} from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import { Scope, ScopeType } from "@/constants/permission.constant";
import {
  CreateProductTranslationRequestDto,
  UpdateProductTranslationRequestDto,
} from "@/dtos/product-translation/product-translation.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { ProductTranslationRepository } from "@/repositories/product-translation/product-translation.repository";

type Actor = {
  userId: UserSchema["id"];
  /** From `@PermissionScope`: `any` sees every translation, `own` only its products'. */
  scope: ScopeType;
};

@Injectable()
export class ProductTranslationService {
  constructor(
    private readonly productTranslationRepository: ProductTranslationRepository,
  ) {}

  /**
   * A translation belongs to whoever owns the product it translates, so the
   * ownership fence is a predicate on the related product. Applied as a `where`
   * so another seller's row resolves to 404, not 403 (same rule as
   * `ManageOrderService.buildActorScope`).
   */
  private translationScope({
    userId,
    scope,
  }: Actor): Prisma.ProductTranslationWhereInput {
    if (scope === Scope.ANY) {
      return {};
    }

    return { product: { createdById: userId, deletedAt: null } };
  }

  /** Same fence, for validating the product a translation is being attached to. */
  private productScope({ userId, scope }: Actor): Prisma.ProductWhereInput {
    return scope === Scope.ANY ? {} : { createdById: userId };
  }

  async getProductTranslations({
    query: {
      page = 1,
      pageSize = 10,
      order = ORDER.ASC,
      orderBy = ORDER_BY.CREATED_AT,
      keyword = "",
    },
    userId,
    scope,
  }: { query: PaginationQueryDto } & Actor) {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Normalize order for Prisma
    const normalizedOrder = order.toLowerCase();

    const { productTranslations, productTranslationsCount } =
      await this.productTranslationRepository.findManyProductTranslations({
        where: {
          ...this.translationScope({ userId, scope }),
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
        page,
        pageSize,
        totalPages,
        totalItems: productTranslationsCount,
      },
    };
  }

  async createProductTranslation({
    data,
    userId,
    scope,
  }: { data: CreateProductTranslationRequestDto } & Actor) {
    // The product must exist and, for an `own` caller, be theirs.
    await this.productTranslationRepository.validateProduct(
      data.productId,
      this.productScope({ userId, scope }),
    );

    const result = this.productTranslationRepository.createProductTranslation({
      data: {
        ...data,
        createdById: userId,
      },
    });

    return result;
  }

  async getProductTranslationById({
    id,
    userId,
    scope,
  }: { id: ProductTranslationSchema["id"] } & Actor) {
    const result =
      await this.productTranslationRepository.findProductTranslationById(
        id,
        this.translationScope({ userId, scope }),
      );

    return result;
  }

  async updateProductTranslation({
    id,
    data,
    userId,
    scope,
  }: {
    id: ProductTranslationSchema["id"];
    data: UpdateProductTranslationRequestDto;
  } & Actor) {
    // Ownership of the row being edited, then of any product it is moved to.
    await this.productTranslationRepository.findProductTranslationById(
      id,
      this.translationScope({ userId, scope }),
    );

    if (data.productId) {
      await this.productTranslationRepository.validateProduct(
        data.productId,
        this.productScope({ userId, scope }),
      );
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
    scope,
  }: { id: ProductTranslationSchema["id"] } & Actor) {
    await this.productTranslationRepository.findProductTranslationById(
      id,
      this.translationScope({ userId, scope }),
    );

    const result =
      await this.productTranslationRepository.deleteProductTranslation({
        id,
        userId,
      });

    return result;
  }
}
