import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsOptional, IsString, IsUrl, IsUUID, Length } from "class-validator";

import { CategoryTranslationWithLanguageResponseDto } from "../category-translation/category-translation.dto";

export class BaseCategoryResponseDto {
  @ApiProperty({
    description: "Unique identifier for the category",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "Name of the category",
    example: "Electronics",
    type: String,
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: "URL to the category's logo image",
    example: "https://example.com/logos/category-logo.png",
    format: "url",
    nullable: true,
  })
  logo: string | null;

  constructor(data?: BaseCategoryResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class CategoryWithParentResponseDto extends BaseCategoryResponseDto {
  @ApiPropertyOptional({
    description: "Parent category details",
    type: () => BaseCategoryResponseDto,
    nullable: true,
  })
  @Expose()
  parentCategory: BaseCategoryResponseDto | null;

  constructor(data?: CategoryWithParentResponseDto) {
    super(data);
    if (data) Object.assign(this, data);
  }
}

export class CategoryWithTranslationsResponseDto extends CategoryWithParentResponseDto {
  @ApiProperty({
    description: "Translations of the category in different languages",
    type: () => [CategoryTranslationWithLanguageResponseDto],
  })
  @Expose()
  categoryTranslations: CategoryTranslationWithLanguageResponseDto[];

  constructor(data?: CategoryWithTranslationsResponseDto) {
    super(data);
    if (data) Object.assign(this, data);
  }
}

export class CategoryWithChildrenCategoriesResponseDto extends CategoryWithTranslationsResponseDto {
  @ApiProperty({
    description: "List of child categories",
    type: () => [BaseCategoryResponseDto],
  })
  @Expose()
  childrenCategories: BaseCategoryResponseDto[];

  constructor(data?: CategoryWithChildrenCategoriesResponseDto) {
    super(data);
    if (data) Object.assign(this, data);
  }
}

export class GetAllCategoriesResponseDto {
  @ApiProperty({
    description: "List of all categories with their translations and children",
    type: () => [CategoryWithChildrenCategoriesResponseDto],
  })
  @Expose()
  data: CategoryWithChildrenCategoriesResponseDto[];

  @ApiProperty({
    description: "Total number of categories",
    example: 100,
  })
  @Expose()
  totalCount: number;

  constructor(data: GetAllCategoriesResponseDto) {
    Object.assign(this, data);
  }
}

export class GetAllCategoriesQueryDto {
  @ApiPropertyOptional({
    description: "Page number for pagination",
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsUUID(4, { message: "Page number must be a valid UUID v4." })
  parentCategoryId?: string;
}

export class CategoryRequestDto {
  @ApiProperty({
    description: "Name of the category",
    example: "Electronics",
    type: String,
  })
  @IsString()
  @Length(1, 255, {
    message: "Category name must be between 1 and 100 characters",
  })
  name: string;

  @ApiPropertyOptional({
    description: "URL to the category's logo image",
    example: "https://example.com/logos/category-logo.png",
    type: String,
  })
  @IsOptional()
  @IsUrl({}, { message: "Logo must be a valid URL." })
  logo?: string;

  @ApiPropertyOptional({
    description:
      "List of category translation IDs to associate with the category",
    type: [String],
    example: ["123e4567-e89b-12d3-a456-426614174000"],
  })
  @IsOptional()
  @IsUUID(4, {
    each: true,
    message: "Each category translation ID must be a valid UUID v4.",
  })
  categoryTranslationIds?: string[];

  @ApiPropertyOptional({
    description: "ID of the parent category",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID(4, { message: "Parent category ID must be a valid UUID v4." })
  parentCategoryId?: string;

  constructor(data?: CategoryRequestDto) {
    if (data) Object.assign(this, data);
  }
}

export class CreateCategoryRequestDto extends CategoryRequestDto {}

export class UpdateCategoryRequestDto extends PartialType(CategoryRequestDto) {}
