import { Module } from "@nestjs/common";

import { ProductTranslationController } from "./product-translation.controller";
import { ProductTranslationService } from "./product-translation.service";

import { ProductTranslationRepository } from "@/repositories/product-translation/product-translation.repository";

@Module({
  imports: [],
  controllers: [ProductTranslationController],
  providers: [ProductTranslationRepository, ProductTranslationService],
  exports: [],
})
export class ProductTranslationModule {}
