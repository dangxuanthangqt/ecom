import { Injectable } from "@nestjs/common";

import { ErrorCode } from "@/constants/error-codes";
import { ORDER, ORDER_BY } from "@/constants/order";
import { OrderPaginationQueryDto } from "@/dtos/order/order.dto";
import {
  Order as OrderSchema,
  User as UserSchema,
} from "@/generated/prisma/client";
import { OrderCancelRepository } from "@/repositories/order/order-cancel.repository";
import { OrderCheckoutRepository } from "@/repositories/order/order-checkout.repository";
import { OrderRepository } from "@/repositories/order/order.repository";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderCheckoutRepository: OrderCheckoutRepository,
    private readonly orderCancelRepository: OrderCancelRepository,
  ) {}

  /** BR-O06/O08: always scoped to the caller's own orders. */
  async getOrders({
    query: {
      page = 1,
      pageSize = 10,
      order = ORDER.ASC,
      orderBy = ORDER_BY.CREATED_AT,
      status,
    },
    userId,
  }: {
    query: OrderPaginationQueryDto;
    userId: UserSchema["id"];
  }) {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const { orders, ordersCount } = await this.orderRepository.findManyOrders({
      where: { userId, status },
      take,
      skip,
      orderBy: { [orderBy]: order.toLowerCase() },
    });

    const totalPages = Math.ceil(ordersCount / pageSize);

    return {
      data: orders,
      pagination: { page, pageSize, totalPages, totalItems: ordersCount },
    };
  }

  /** BR-O06: a foreign `orderId` resolves to 404, never a 403. */
  async getOrderById({
    orderId,
    userId,
  }: {
    orderId: OrderSchema["id"];
    userId: UserSchema["id"];
  }) {
    const order = await this.orderRepository.findUniqueOrder({
      where: { id: orderId, userId },
    });

    if (!order) {
      throwHttpException({
        type: "notFound",
        code: ErrorCode.ORDER_NOT_FOUND,
        message: "Order not found.",
      });
    }

    return order;
  }

  /** BR-O01/O02/O03/O07 — delegates the interactive transaction to the repository. */
  async checkout({
    cartItemIds,
    userId,
  }: {
    cartItemIds: string[];
    userId: UserSchema["id"];
  }) {
    return this.orderCheckoutRepository.checkout({ cartItemIds, userId });
  }

  /** BR-O04 — buyer-only cancellation, delegated to the repository transaction. */
  async cancelOrder({
    orderId,
    userId,
  }: {
    orderId: OrderSchema["id"];
    userId: UserSchema["id"];
  }) {
    return this.orderCancelRepository.cancelOrder({ orderId, userId });
  }
}
