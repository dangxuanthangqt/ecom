import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { ErrorCode } from "@/constants/error-codes";
import { publishedProductWhere } from "@/constants/product-visibility.constant";
import { createCartItemSelect } from "@/selectors/cart-item.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import { isRecordNotFoundPrismaError } from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

import { upsertCartItemWithConflictRetry } from "./cart-upsert.util";

@Injectable()
export class CartRepository {
  private logger = new Logger(CartRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /** Own cart lines only — callers must pass `userId` inside `where`. */
  async findManyCartItems({
    where,
    take,
    skip,
    orderBy,
  }: Pick<Prisma.CartItemFindManyArgs, "where" | "take" | "skip" | "orderBy">) {
    try {
      const $cartItems = this.prismaService.cartItem.findMany({
        where,
        take,
        skip,
        orderBy,
        select: createCartItemSelect(),
      });
      const $cartItemsCount = this.prismaService.cartItem.count({ where });

      const [cartItemsCount, cartItems] = await this.prismaService.$transaction(
        [$cartItemsCount, $cartItems],
      );

      return { cartItems, cartItemsCount };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch cart items.",
      });
    }
  }

  /**
   * Ownership is baked into the `where` clause (BR-C01) — a `cartItemId`
   * owned by another user resolves to `null`, and the caller maps that to a
   * 404, never a 403.
   */
  async findUniqueCartItem({
    cartItemId,
    userId,
  }: {
    cartItemId: string;
    userId: string;
  }) {
    try {
      return await this.prismaService.cartItem.findFirst({
        where: { id: cartItemId, userId },
        select: createCartItemSelect(),
      });
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch cart item.",
      });
    }
  }

  /**
   * Resolves a SKU only if it (and its parent product) is addable per
   * BR-C02, together with the caller's existing cart quantity for it (0 or 1
   * row, thanks to the `(userId, skuId)` unique constraint) so BR-C03's
   * stock ceiling can be checked in one round-trip.
   */
  async findAddableSku({ skuId, userId }: { skuId: string; userId: string }) {
    try {
      return await this.prismaService.sKU.findFirst({
        where: {
          id: skuId,
          deletedAt: null,
          product: publishedProductWhere(),
        },
        select: {
          id: true,
          stock: true,
          cartItems: {
            where: { userId },
            select: { quantity: true },
          },
        },
      });
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch SKU.",
      });
    }
  }

  /** BR-C04: one line per SKU — conflict handling lives in `cart-upsert.util`. */
  async upsertCartItem(args: {
    userId: string;
    skuId: string;
    quantity: number;
  }) {
    return upsertCartItemWithConflictRetry({
      prismaService: this.prismaService,
      logger: this.logger,
      ...args,
    });
  }

  /** Ownership baked into `where` (BR-C01) — a miss remaps P2025 to a 404. */
  async updateCartItem({
    cartItemId,
    userId,
    quantity,
  }: {
    cartItemId: string;
    userId: string;
    quantity: number;
  }) {
    try {
      return await this.prismaService.cartItem.update({
        where: { id: cartItemId, userId },
        data: { quantity },
        select: createCartItemSelect(),
      });
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          code: ErrorCode.CART_ITEM_NOT_FOUND,
          message: "Cart item not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update cart item.",
      });
    }
  }

  /** BR-C05: `CartItem` has no `deletedAt` — removal is always a hard delete. */
  async deleteCartItem({
    cartItemId,
    userId,
  }: {
    cartItemId: string;
    userId: string;
  }) {
    try {
      await this.prismaService.cartItem.delete({
        where: { id: cartItemId, userId },
      });

      return { message: "Cart item removed successfully." };
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          code: ErrorCode.CART_ITEM_NOT_FOUND,
          message: "Cart item not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to remove cart item.",
      });
    }
  }
}
