import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import {
  Category as CategorySchema,
  Language as LanguageSchema,
  User as UserSchema,
} from "@prisma/client";

import {
  CategoryWithChildrenCategoriesResponseDto,
  CreateCategoryRequestDto,
  GetAllCategoriesQueryDto,
  GetAllCategoriesResponseDto,
  UpdateCategoryRequestDto,
} from "@/dtos/category/category.dto";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import { CurrentLang } from "@/shared/param-decorators/current-lang.decorator";
import { ApiAuth } from "@/shared/param-decorators/http-decorator";

import { CategoryService } from "./category.service";

@ApiTags("Categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiAuth({
    type: GetAllCategoriesResponseDto,
    options: {
      summary: "Get all categories",
      description:
        "Retrieve all categories with optional filtering by language and parent category.",
    },
  })
  @Get()
  async getAllCategories(
    @CurrentLang() languageId: LanguageSchema["id"],
    @Query() { parentCategoryId }: GetAllCategoriesQueryDto,
  ): Promise<GetAllCategoriesResponseDto> {
    const result = await this.categoryService.getAllCategories({
      languageId,
      parentCategoryId,
    });

    const data = {
      data: result,
      totalCount: result.length,
    };

    return new GetAllCategoriesResponseDto(data);
  }

  @ApiAuth({
    type: CategoryWithChildrenCategoriesResponseDto,
    options: {
      summary: "Get category by ID",
      description:
        "Retrieve a single category by its ID, including its translations in the specified language.",
    },
  })
  @Get(":id")
  @ApiParam({
    name: "id",
    type: String,
    description: "Category ID (UUID)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  async getCategoryById(
    @CurrentLang() languageId: LanguageSchema["id"],
    @Param("id", ParseUUIDPipe) id: CategorySchema["id"],
  ): Promise<CategoryWithChildrenCategoriesResponseDto> {
    const result = await this.categoryService.getCategoryById({
      id,
      languageId,
    });

    return new CategoryWithChildrenCategoriesResponseDto(result);
  }

  @ApiAuth({
    type: CategoryWithChildrenCategoriesResponseDto,
    options: {
      summary: "Create a new category",
      description: "Create a new category with translations and children.",
    },
  })
  @Post()
  async createCategory(
    @Body() body: CreateCategoryRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<CategoryWithChildrenCategoriesResponseDto> {
    const result = await this.categoryService.createCategory({
      body,
      userId,
    });

    return new CategoryWithChildrenCategoriesResponseDto(result);
  }

  @ApiAuth({
    type: CategoryWithChildrenCategoriesResponseDto,
    options: {
      summary: "Update an existing category",
      description: "Update a category by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    type: String,
    description: "Category ID (UUID)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Put(":id")
  async updateCategory(
    @Param("id", ParseUUIDPipe) id: CategorySchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
    @Body() body: UpdateCategoryRequestDto,
  ): Promise<CategoryWithChildrenCategoriesResponseDto> {
    const result = await this.categoryService.updateCategory({
      id,
      body,
      userId,
    });

    return new CategoryWithChildrenCategoriesResponseDto(result);
  }

  @ApiAuth({
    type: CategoryWithChildrenCategoriesResponseDto,
    options: {
      summary: "Delete a category",
      description: "Delete a category by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    type: String,
    description: "Category ID (UUID)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Delete(":id")
  async deleteCategory(
    @Param("id", ParseUUIDPipe) id: CategorySchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<CategoryWithChildrenCategoriesResponseDto> {
    const result = await this.categoryService.deleteCategory({
      id,
      userId,
    });

    return new CategoryWithChildrenCategoriesResponseDto(result);
  }
}
