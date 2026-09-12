import { Injectable } from "@nestjs/common";
import {
  Order as OrderSchema,
  OrderStatus,
  Prisma,
  Role as RoleSchema,
  User as UserSchema,
} from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import { canTransition } from "@/constants/order-status.constant";
import { Role } from "@/constants/role.constant";
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
   * BR-O06 visibility scope: admin sees everything, seller only orders
   * whose snapshot items reference their own products. This is a `where`
   * predicate, never a post-fetch 403 — a miss must resolve to 404.
   */
  private buildActorScope({
    userId,
    roleName,
  }: {
    userId: UserSchema["id"];
    roleName: RoleSchema["name"];
  }): Prisma.OrderWhereInput {
    if (roleName === Role.ADMIN) {
      return {};
    }

    return { products: { some: { createdById: userId, deletedAt: null } } };
  }

  async getOrders({
    query: {
      pageIndex = 1,
      pageSize = 10,
      order = ORDER.ASC,
      orderBy = ORDER_BY.CREATED_AT,
      status,
      createdById,
    },
    userId,
    roleName,
  }: {
    query: ManageOrderPaginationQueryDto;
    userId: UserSchema["id"];
    roleName: RoleSchema["name"];
  }) {
    const skip = (pageIndex - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.OrderWhereInput = {
      status,
      AND: [
        this.buildActorScope({ userId, roleName }),
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
      pagination: { pageIndex, pageSize, totalPages, totalItems: ordersCount },
    };
  }

  /** BR-O06: another party's `orderId` resolves to 404, never a 403. */
  async getOrderById({
    orderId,
    userId,
    roleName,
  }: {
    orderId: OrderSchema["id"];
    userId: UserSchema["id"];
    roleName: RoleSchema["name"];
  }) {
    const scope = this.buildActorScope({ userId, roleName });
    const order = await this.orderRepository.findUniqueOrder({
      where: { id: orderId, ...scope },
    });

    if (!order) {
      throwHttpException({ type: "notFound", message: "Order not found." });
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
    roleName,
  }: {
    orderId: OrderSchema["id"];
    status: OrderStatus;
    userId: UserSchema["id"];
    roleName: RoleSchema["name"];
  }) {
    // BR-O04: cancellation is buyer-only, never a seller/admin action.
    if (nextStatus === OrderStatus.CANCELLED) {
      throwHttpException({
        type: "badRequest",
        message: "Only the buyer may cancel an order.",
      });
    }

    const scope = this.buildActorScope({ userId, roleName });
    const order = await this.orderRepository.findUniqueOrder({
      where: { id: orderId, ...scope },
    });

    if (!order) {
      throwHttpException({ type: "notFound", message: "Order not found." });
    }

    if (!canTransition({ from: order.status, to: nextStatus })) {
      throwHttpException({
        type: "badRequest",
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
