import { Module } from "@nestjs/common";

import { CategoryTranslationRepository } from "@/repositories/category-translation/category-translation.repository";

import { CategoryTranslationController } from "./category-translation.controller";
import { CategoryTranslationService } from "./category-translation.service";

@Module({
  imports: [],
  controllers: [CategoryTranslationController],
  providers: [CategoryTranslationRepository, CategoryTranslationService],
  exports: [],
})
export class CategoryTranslationModule {}
