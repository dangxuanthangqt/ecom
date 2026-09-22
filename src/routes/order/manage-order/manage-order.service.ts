import { Injectable } from "@nestjs/common";
import {
  Order as OrderSchema,
  OrderStatus,
  Prisma,
  User as UserSchema,
} from "@prisma/client";

import { ErrorCode } from "@/constants/error-codes";
import { ORDER, ORDER_BY } from "@/constants/order";
import { canTransition } from "@/constants/order-status.constant";
import { Scope, ScopeType } from "@/constants/permission.constant";
import { ManageOrderPaginationQueryDto } from "@/dtos/order/manage-order.dto";
import { OrderStatusRepository } from "@/repositories/order/order-status.repository";
import { OrderRepository } from "@/repositories/order/order.repository";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class ManageOrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderStatusRepository: OrderStatusRepository,
  ) {}

  /**
   * BR-O06 visibility scope. `scope` is what the caller's grants say for
   * `order-fulfilment` (see `@PermissionScope`): `any` sees every order,
   * `own` only orders whose snapshot items reference the caller's products.
   * This is a `where` predicate, never a post-fetch 403 — a miss must resolve
   * to 404.
   */
  private buildActorScope({
    userId,
    scope,
  }: {
    userId: UserSchema["id"];
    scope: ScopeType;
  }): Prisma.OrderWhereInput {
    if (scope === Scope.ANY) {
      return {};
    }

    return { products: { some: { createdById: userId, deletedAt: null } } };
  }

  async getOrders({
    query: {
      page = 1,
      pageSize = 10,
      order = ORDER.ASC,
      orderBy = ORDER_BY.CREATED_AT,
      status,
      createdById,
    },
    userId,
    scope,
  }: {
    query: ManageOrderPaginationQueryDto;
    userId: UserSchema["id"];
    scope: ScopeType;
  }) {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.OrderWhereInput = {
      status,
      AND: [
        this.buildActorScope({ userId, scope }),
        ...(createdById ? [{ products: { some: { createdById } } }] : []),
      ],
    };

    const { orders, ordersCount } = await this.orderRepository.findManyOrders({
      where,
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

  /** BR-O06: another party's `orderId` resolves to 404, never a 403. */
  async getOrderById({
    orderId,
    userId,
    scope,
  }: {
    orderId: OrderSchema["id"];
    userId: UserSchema["id"];
    scope: ScopeType;
  }) {
    const actorScope = this.buildActorScope({ userId, scope });
    const order = await this.orderRepository.findUniqueOrder({
      where: { id: orderId, ...actorScope },
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

  /**
   * BR-O05: only the seller/admin actor rule and transition legality live
   * here — the conditional write and its concurrency guard are delegated to
   * `OrderStatusRepository`.
   */
  async updateOrderStatus({
    orderId,
    status: nextStatus,
    userId,
    scope,
  }: {
    orderId: OrderSchema["id"];
    status: OrderStatus;
    userId: UserSchema["id"];
    scope: ScopeType;
  }) {
    // BR-O04: cancellation is buyer-only, never a seller/admin action.
    if (nextStatus === OrderStatus.CANCELLED) {
      throwHttpException({
        type: "badRequest",
        code: ErrorCode.ORDER_CANCEL_FORBIDDEN,
        message: "Only the buyer may cancel an order.",
      });
    }

    const actorScope = this.buildActorScope({ userId, scope });
    const order = await this.orderRepository.findUniqueOrder({
      where: { id: orderId, ...actorScope },
    });

    if (!order) {
      throwHttpException({
        type: "notFound",
        code: ErrorCode.ORDER_NOT_FOUND,
        message: "Order not found.",
      });
    }

    if (!canTransition({ from: order.status, to: nextStatus })) {
      throwHttpException({
        type: "badRequest",
        code: ErrorCode.ORDER_STATUS_TRANSITION_INVALID,
        message: `Cannot transition order from ${order.status} to ${nextStatus}.`,
      });
    }

    return this.orderStatusRepository.updateOrderStatus({
      orderId,
      currentStatus: order.status,
      nextStatus,
      userId,
    });
  }
}
