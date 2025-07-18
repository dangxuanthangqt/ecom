import { Module } from "@nestjs/common";

import { CategoryRepository } from "@/repositories/category/category.repository";

import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";

@Module({
  controllers: [CategoryController],
  providers: [CategoryRepository, CategoryService],
})
export class CategoryModule {}
