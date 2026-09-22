import { HttpException, Injectable, Logger } from "@nestjs/common";

import { ErrorCode } from "@/constants/error-codes";
import { OrderStatus, Prisma } from "@/generated/prisma/client";
import { createOrderDetailSelect } from "@/selectors/order.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import { defineSelect } from "@/shared/utils/prisma-select.util";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

import {
  assertAllOwned,
  buildSnapshotRows,
  groupBySeller,
  isRowPurchasable,
} from "./order-checkout.helper";

/** Prisma's default interactive-transaction timeout (5s) is too tight for a
 * multi-line, multi-seller checkout — see Risk Assessment in the phase plan. */
const CHECKOUT_TRANSACTION_TIMEOUT_MS = 15000;

/**
 * One-off select for the transaction's own `tx.cartItem.findMany` — distinct
 * from `createCartItemSelect()` (owned by the cart module) because checkout
 * additionally needs `sku.deletedAt` and `product.images` to validate and
 * freeze a snapshot row.
 */
const checkoutCartItemSelect = defineSelect<Prisma.CartItemSelect>()({
  id: true,
  quantity: true,
  sku: {
    select: {
      id: true,
      value: true,
      price: true,
      stock: true,
      deletedAt: true,
      product: {
        select: {
          id: true,
          name: true,
          images: true,
          publishedAt: true,
          deletedAt: true,
          createdById: true,
        },
      },
    },
  },
});

@Injectable()
export class OrderCheckoutRepository {
  private logger = new Logger(OrderCheckoutRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * BR-O01/O02/O03/O07 — one interactive transaction: re-validate the
   * caller's cart lines → decrement stock conditionally → create one Order
   * (+ frozen snapshot lines) per seller → delete the consumed cart lines.
   * Any throw inside the callback rolls back every write already issued.
   */
  async checkout({
    cartItemIds,
    userId,
  }: {
    cartItemIds: string[];
    userId: string;
  }) {
    try {
      return await this.prismaService.$transaction(
        async (tx) => {
          // this is interactive transaction
          // https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions
          const rows = await tx.cartItem.findMany({
            where: { id: { in: cartItemIds }, userId },
            select: checkoutCartItemSelect,
          });

          assertAllOwned({ cartItemIds, rows });

          for (const row of rows) {
            if (!isRowPurchasable(row)) {
              throwHttpException({
                type: "badRequest",
                code: ErrorCode.SKU_UNAVAILABLE,
                message: `SKU ${row.sku.id} is no longer available.`,
              });
            }
          }

          for (const row of rows) {
            const { count } = await tx.sKU.updateMany({
              where: {
                id: row.sku.id,
                stock: { gte: row.quantity },
                deletedAt: null,
              },
              data: { stock: { decrement: row.quantity } },
            });

            if (count !== 1) {
              const current = await tx.sKU.findUnique({
                where: { id: row.sku.id },
                select: { stock: true },
              });

              throwHttpException({
                type: "badRequest",
                code: ErrorCode.SKU_INSUFFICIENT_STOCK,
                message: `SKU ${row.sku.id} only has ${current?.stock ?? 0} left in stock.`,
              });
            }
          }

          const groups = groupBySeller(rows);
          const orders: Prisma.OrderGetPayload<{
            select: ReturnType<typeof createOrderDetailSelect>;
          }>[] = [];

          for (const group of groups) {
            const productIds = [
              ...new Set(group.rows.map((row) => row.sku.product.id)),
            ];

            const order = await tx.order.create({
              data: {
                userId,
                createdById: userId,
                status: OrderStatus.PENDING_CONFIRMATION,
                products: { connect: productIds.map((id) => ({ id })) },
                items: { create: buildSnapshotRows(group.rows) },
              },
              select: createOrderDetailSelect(),
            });

            orders.push(order);
          }

          await tx.cartItem.deleteMany({
            where: { id: { in: cartItemIds }, userId },
          });

          return orders;
        },
        { timeout: CHECKOUT_TRANSACTION_TIMEOUT_MS },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(error);
      throwHttpException({
        type: "internal",
        message: "Failed to checkout cart.",
      });
    }
  }
}
