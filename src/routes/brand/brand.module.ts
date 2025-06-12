import { Module } from "@nestjs/common";

import { BrandController } from "./brand.controller";
import { BrandService } from "./brand.service";

import { BrandRepository } from "@/repositories/brand/brand.repository";

@Module({
  imports: [],
  controllers: [BrandController],
  providers: [BrandService, BrandRepository],
  exports: [],
})
export class BrandModule {}
