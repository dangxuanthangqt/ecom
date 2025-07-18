import { Module } from "@nestjs/common";

import { BrandTranslationRepository } from "@/repositories/brand-translation/brand-translation.repository";

import { BrandTranslationController } from "./brand-translation.controller";
import { BrandTranslationService } from "./brand-translation.service";

@Module({
  imports: [],
  controllers: [BrandTranslationController],
  providers: [BrandTranslationService, BrandTranslationRepository],
  exports: [],
})
export class BrandTranslationModule {}
