import { Module } from "@nestjs/common";

import { LanguageController } from "./language.controller";
import { LanguageService } from "./language.service";

import { LanguageRepository } from "@/repositories/language/language.repository";

@Module({
  controllers: [LanguageController],
  providers: [LanguageService, LanguageRepository],
  exports: [],
})
export class LanguageModule {}
