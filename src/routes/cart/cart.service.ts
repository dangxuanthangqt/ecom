import { Injectable } from "@nestjs/common";

import { ErrorCode } from "@/constants/error-codes";
import { ORDER, ORDER_BY } from "@/constants/order";
import { CartPaginationQueryDto } from "@/dtos/cart/cart.dto";
import {
  CartItem as CartItemSchema,
  User as UserSchema,
} from "@/generated/prisma/client";
import { CartRepository } from "@/repositories/cart/cart.repository";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class CartService {
  constructor(private readonly cartRepository: CartRepository) {}

  /** BR-C01: always scoped to the caller's own cart lines. */
  async getCartItems({
    query: {
      page = 1,
      pageSize = 10,
      order = ORDER.ASC,
      orderBy = ORDER_BY.CREATED_AT,
    },
    userId,
  }: {
    query: CartPaginationQueryDto;
    userId: UserSchema["id"];
  }) {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const { cartItems, cartItemsCount } =
      await this.cartRepository.findManyCartItems({
        where: { userId },
        take,
        skip,
        orderBy: { [orderBy]: order.toLowerCase() },
      });

    const totalPages = Math.ceil(cartItemsCount / pageSize);

    return {
      data: cartItems,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems: cartItemsCount,
      },
    };
  }

  /** BR-C02 (addable SKU), BR-C03 (stock ceiling), BR-C04 (one line/SKU). */
  async addCartItem({
    skuId,
    quantity,
    userId,
  }: {
    skuId: CartItemSchema["skuId"];
    quantity: number;
    userId: UserSchema["id"];
  }) {
    const sku = await this.cartRepository.findAddableSku({ skuId, userId });

    if (!sku) {
      throwHttpException({
        type: "notFound",
        code: ErrorCode.SKU_NOT_FOUND,
        message: "SKU not found.",
      });
    }

    const currentQuantity = sku.cartItems[0]?.quantity ?? 0;
    const resultingQuantity = currentQuantity + quantity;

    if (resultingQuantity > sku.stock) {
      throwHttpException({
        type: "badRequest",
        code: ErrorCode.CART_ITEM_INSUFFICIENT_STOCK,
        message: `Only ${sku.stock} left in stock for this SKU.`,
      });
    }

    return this.cartRepository.upsertCartItem({ userId, skuId, quantity });
  }

  /** BR-C01 (ownership) and BR-C03 (stock ceiling) against the absolute value. */
  async updateCartItemQuantity({
    cartItemId,
    quantity,
    userId,
  }: {
    cartItemId: CartItemSchema["id"];
    quantity: number;
    userId: UserSchema["id"];
  }) {
    const cartItem = await this.cartRepository.findUniqueCartItem({
      cartItemId,
      userId,
    });

    if (!cartItem) {
      throwHttpException({
        type: "notFound",
        code: ErrorCode.CART_ITEM_NOT_FOUND,
        message: "Cart item not found.",
      });
    }

    if (quantity > cartItem.sku.stock) {
      throwHttpException({
        type: "badRequest",
        code: ErrorCode.CART_ITEM_INSUFFICIENT_STOCK,
        message: `Only ${cartItem.sku.stock} left in stock for this SKU.`,
      });
    }

    return this.cartRepository.updateCartItem({
      cartItemId,
      userId,
      quantity,
    });
  }

  /** BR-C01 (ownership) and BR-C05 (hard delete) — enforced in the repository. */
  async deleteCartItem({
    cartItemId,
    userId,
  }: {
    cartItemId: CartItemSchema["id"];
    userId: UserSchema["id"];
  }) {
    return this.cartRepository.deleteCartItem({ cartItemId, userId });
  }
}
