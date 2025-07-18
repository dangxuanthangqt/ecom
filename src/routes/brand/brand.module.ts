import { Module } from "@nestjs/common";

import { BrandRepository } from "@/repositories/brand/brand.repository";

import { BrandController } from "./brand.controller";
import { BrandService } from "./brand.service";

@Module({
  imports: [],
  controllers: [BrandController],
  providers: [BrandService, BrandRepository],
  exports: [],
})
export class BrandModule {}
