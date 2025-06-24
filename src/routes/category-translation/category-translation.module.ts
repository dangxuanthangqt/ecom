import { Module } from "@nestjs/common";

import { CategoryTranslationController } from "./category-translation.controller";
import { CategoryTranslationService } from "./category-translation.service";

import { CategoryTranslationRepository } from "@/repositories/category-translation/category-translation.repository";

@Module({
  imports: [],
  controllers: [CategoryTranslationController],
  providers: [CategoryTranslationRepository, CategoryTranslationService],
  exports: [],
})
export class CategoryTranslationModule {}
