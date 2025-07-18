import { Module } from "@nestjs/common";

import { ProductRepository } from "@/repositories/product/product.repository";

import { ManageProductController } from "./manage-product/manage-product.controller";
import { ManageProductService } from "./manage-product/manage-product.service";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";

@Module({
  imports: [],
  controllers: [ProductController, ManageProductController],
  providers: [ProductService, ManageProductService, ProductRepository],
  exports: [],
})
export class ProductModule {}
