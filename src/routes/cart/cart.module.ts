import { Module } from "@nestjs/common";

import { CartRepository } from "@/repositories/cart/cart.repository";

import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

@Module({
  imports: [],
  controllers: [CartController],
  providers: [CartService, CartRepository],
  exports: [],
})
export class CartModule {}
