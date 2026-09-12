import { Module } from "@nestjs/common";

import { OrderCancelRepository } from "@/repositories/order/order-cancel.repository";
import { OrderCheckoutRepository } from "@/repositories/order/order-checkout.repository";
import { OrderRepository } from "@/repositories/order/order.repository";

import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";

@Module({
  imports: [],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderRepository,
    OrderCheckoutRepository,
    OrderCancelRepository,
  ],
  exports: [],
})
export class OrderModule {}
