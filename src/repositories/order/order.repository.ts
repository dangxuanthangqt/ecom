import { Injectable, Logger } from "@nestjs/common";

import { Prisma } from "@/generated/prisma/client";
import {
  createOrderDetailSelect,
  orderSelect,
} from "@/selectors/order.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class OrderRepository {
  private logger = new Logger(OrderRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /** BR-O08: every read filters `deletedAt: null`; callers scope visibility via `where`. */
  async findManyOrders({
    where,
    take,
    skip,
    orderBy,
  }: Pick<Prisma.OrderFindManyArgs, "where" | "take" | "skip" | "orderBy">) {
    try {
      const combinedWhere: Prisma.OrderWhereInput = {
        ...where,
        deletedAt: null,
      };

      const $orders = this.prismaService.order.findMany({
        where: combinedWhere,
        take,
        skip,
        orderBy,
        select: orderSelect,
      });
      const $ordersCount = this.prismaService.order.count({
        where: combinedWhere,
      });

      const [orders, ordersCount] = await this.prismaService.$transaction([
        $orders,
        $ordersCount,
      ]);

      return { orders, ordersCount };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch orders.",
      });
    }
  }

  /**
   * Visibility is baked into `where` by the caller (buyer scopes by
   * `userId`; phase 04's manage-order scopes by seller/admin) — a miss
   * resolves to `null`, mapped by the caller to a 404, never a 403 (BR-O06).
   */
  async findUniqueOrder({ where }: { where: Prisma.OrderWhereInput }) {
    try {
      return await this.prismaService.order.findFirst({
        where: { ...where, deletedAt: null },
        select: createOrderDetailSelect(),
      });
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch order.",
      });
    }
  }
}
