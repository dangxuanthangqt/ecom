import { Module } from "@nestjs/common";

import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";

import { CategoryRepository } from "@/repositories/category/category.repository";

@Module({
  controllers: [CategoryController],
  providers: [CategoryRepository, CategoryService],
})
export class CategoryModule {}
