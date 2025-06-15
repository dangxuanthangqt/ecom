import { Module } from "@nestjs/common";

import { BrandTranslationController } from "./brand-translation.controller";
import { BrandTranslationService } from "./brand-translation.service";

import { BrandTranslationRepository } from "@/repositories/brand-translation/brand-translation.repository";

@Module({
  imports: [],
  controllers: [BrandTranslationController],
  providers: [BrandTranslationService, BrandTranslationRepository],
  exports: [],
})
export class BrandTranslationModule {}
