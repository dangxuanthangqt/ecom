import { HttpException, Injectable, Logger } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

import { ErrorCode } from "@/constants/error-codes";
import { createOrderDetailSelect } from "@/selectors/order.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

/**
 * Split out of `order-checkout.repository.ts` per the phase plan's Risk
 * Assessment (keeping the checkout transaction file under 200 lines) —
 * cancel is already a separate transaction from checkout (BR-O04).
 */
@Injectable()
export class OrderCancelRepository {
  private logger = new Logger(OrderCancelRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * BR-O04 — only the owning buyer, only from `PENDING_CONFIRMATION`;
   * restores stock for every snapshot line (skipping a hard-deleted SKU).
   */
  async cancelOrder({ orderId, userId }: { orderId: string; userId: string }) {
    try {
      return await this.prismaService.$transaction(async (tx) => {
        // this is interactive transaction
        // https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions
        const { count } = await tx.order.updateMany({
          where: {
            id: orderId,
            userId,
            status: OrderStatus.PENDING_CONFIRMATION,
            deletedAt: null,
          },
          data: { status: OrderStatus.CANCELLED, updatedById: userId },
        });

        if (count === 0) {
          const existing = await tx.order.findFirst({
            where: { id: orderId, userId, deletedAt: null },
            select: { id: true },
          });

          if (!existing) {
            throwHttpException({
              type: "notFound",
              code: ErrorCode.ORDER_NOT_FOUND,
              message: "Order not found.",
            });
          }

          throwHttpException({
            type: "badRequest",
            code: ErrorCode.ORDER_NOT_CANCELLABLE,
            message: "Only orders pending confirmation can be cancelled.",
          });
        }

        const snapshots = await tx.productSKUSnapshot.findMany({
          where: { orderId },
          select: { skuId: true, quantity: true },
        });

        for (const snapshot of snapshots) {
          if (!snapshot.skuId) {
            continue;
          }

          await tx.sKU.update({
            where: { id: snapshot.skuId },
            data: { stock: { increment: snapshot.quantity } },
          });
        }

        return tx.order.findUniqueOrThrow({
          where: { id: orderId },
          select: createOrderDetailSelect(),
        });
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(error);
      throwHttpException({
        type: "internal",
        message: "Failed to cancel order.",
      });
    }
  }
}
