import { Module } from "@nestjs/common";

import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";

import { ProductRepository } from "@/repositories/product/product.repository";

@Module({
  imports: [],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [],
})
export class ProductModule {}
