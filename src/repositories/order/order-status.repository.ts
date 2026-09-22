import { HttpException, Injectable, Logger } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

import { ErrorCode } from "@/constants/error-codes";
import { createOrderDetailSelect } from "@/selectors/order.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

/**
 * Seller/admin status write (BR-O05/BR-O08), split out of the read-only
 * `OrderRepository` per the phase plan — the conditional `updateMany` is a
 * write concern with its own concurrency-conflict path.
 */
@Injectable()
export class OrderStatusRepository {
  private logger = new Logger(OrderStatusRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Conditional on the caller's observed `currentStatus` so two concurrent
   * seller/admin writes cannot both advance the same order (`count === 0`
   * means someone else moved it first — a 409, never a silent no-op).
   */
  async updateOrderStatus({
    orderId,
    currentStatus,
    nextStatus,
    userId,
  }: {
    orderId: string;
    currentStatus: OrderStatus;
    nextStatus: OrderStatus;
    userId: string;
  }) {
    try {
      const { count } = await this.prismaService.order.updateMany({
        where: { id: orderId, status: currentStatus, deletedAt: null },
        data: { status: nextStatus, updatedById: userId },
      });

      if (count === 0) {
        throwHttpException({
          type: "conflict",
          code: ErrorCode.ORDER_STATUS_CONFLICT,
          message:
            "Order status was changed by someone else in the meantime. Please retry.",
        });
      }

      return await this.prismaService.order.findUniqueOrThrow({
        where: { id: orderId },
        select: createOrderDetailSelect(),
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(error);
      throwHttpException({
        type: "internal",
        message: "Failed to update order status.",
      });
    }
  }
}
