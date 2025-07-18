import { Module } from "@nestjs/common";

import { LanguageRepository } from "@/repositories/language/language.repository";

import { LanguageController } from "./language.controller";
import { LanguageService } from "./language.service";

@Module({
  controllers: [LanguageController],
  providers: [LanguageService, LanguageRepository],
  exports: [],
})
export class LanguageModule {}
