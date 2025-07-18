import { Module } from "@nestjs/common";

import { ProductTranslationRepository } from "@/repositories/product-translation/product-translation.repository";

import { ProductTranslationController } from "./product-translation.controller";
import { ProductTranslationService } from "./product-translation.service";

@Module({
  imports: [],
  controllers: [ProductTranslationController],
  providers: [ProductTranslationRepository, ProductTranslationService],
  exports: [],
})
export class ProductTranslationModule {}
