import { Module } from "@nestjs/common";

import { OrderCancelRepository } from "@/repositories/order/order-cancel.repository";
import { OrderCheckoutRepository } from "@/repositories/order/order-checkout.repository";
import { OrderStatusRepository } from "@/repositories/order/order-status.repository";
import { OrderRepository } from "@/repositories/order/order.repository";

import { ManageOrderController } from "./manage-order/manage-order.controller";
import { ManageOrderService } from "./manage-order/manage-order.service";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";

@Module({
  imports: [],
  controllers: [OrderController, ManageOrderController],
  providers: [
    OrderService,
    OrderRepository,
    OrderCheckoutRepository,
    OrderCancelRepository,
    ManageOrderService,
    OrderStatusRepository,
  ],
  exports: [],
})
export class OrderModule {}
