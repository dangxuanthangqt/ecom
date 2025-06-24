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
  CategoryTranslation as CategoryTranslationSchema,
  User as UserSchema,
} from "@prisma/client";

import { CategoryTranslationService } from "./category-translation.service";

import {
  CategoryTranslationWithCategoryAndLanguageResponseDto,
  CreateCategoryTranslationRequestDto,
  UpdateCategoryTranslationRequestDto,
} from "@/dtos/category-translation/category-translation.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { ApiAuth, ApiPageOkResponse } from "@/shared/decorators/http-decorator";

@ApiTags("Category Translations")
@Controller("category-translations")
export class CategoryTranslationController {
  constructor(
    private readonly categoryTranslationService: CategoryTranslationService,
  ) {}

  @ApiPageOkResponse({
    summary: "Get a list of category translations",
    description: "Retrieve a list of category translations with pagination.",
    type: CategoryTranslationWithCategoryAndLanguageResponseDto,
  })
  @Get()
  async getCategoryTranslations(@Query() query: PaginationQueryDto) {
    const result =
      await this.categoryTranslationService.getCategoryTranslations(query);

    return new PageDto<CategoryTranslationWithCategoryAndLanguageResponseDto>(
      result,
    );
  }

  @ApiAuth({
    type: CategoryTranslationWithCategoryAndLanguageResponseDto,
    options: {
      summary: "Get a category translation by ID",
      description: "Retrieves a specific category translation by its ID.",
    },
  })
  @Get(":id")
  async getCategoryTranslationById(
    @Param("id", ParseUUIDPipe) id: CategoryTranslationSchema["id"],
  ) {
    const result =
      await this.categoryTranslationService.getCategoryTranslationById(id);

    return new CategoryTranslationWithCategoryAndLanguageResponseDto(result);
  }

  @ApiAuth({
    type: CategoryTranslationWithCategoryAndLanguageResponseDto,
    options: {
      summary: "Create a new category translation",
      description: "Creates a new category translation.",
    },
  })
  @Post()
  async createCategoryTranslation(
    @Body() data: CreateCategoryTranslationRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ) {
    const result =
      await this.categoryTranslationService.createCategoryTranslation({
        data,
        userId,
      });

    return new CategoryTranslationWithCategoryAndLanguageResponseDto(result);
  }

  @ApiAuth({
    type: CategoryTranslationWithCategoryAndLanguageResponseDto,
    options: {
      summary: "Update an existing category translation",
      description: "Updates a category translation by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    description: "The ID of the category translation to update",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: true,
    type: String,
  })
  @Put(":id")
  async updateCategoryTranslation(
    @Param("id", ParseUUIDPipe) id: CategoryTranslationSchema["id"],
    @Body() data: UpdateCategoryTranslationRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ) {
    const result =
      await this.categoryTranslationService.updateCategoryTranslation({
        id,
        data,
        userId,
      });

    return new CategoryTranslationWithCategoryAndLanguageResponseDto(result);
  }

  @ApiAuth({
    type: CategoryTranslationWithCategoryAndLanguageResponseDto,
    options: {
      summary: "Delete a category translation",
      description: "Deletes a category translation by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    description: "The ID of the category translation to delete",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: true,
    type: String,
  })
  @Delete(":id")
  async deleteCategoryTranslation(
    @Param("id", ParseUUIDPipe) id: CategoryTranslationSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
  ) {
    const result =
      await this.categoryTranslationService.deleteCategoryTranslation({
        id,
        userId,
      });

    return new CategoryTranslationWithCategoryAndLanguageResponseDto(result);
  }
}
