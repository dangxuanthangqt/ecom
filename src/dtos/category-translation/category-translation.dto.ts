import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString, IsUUID, Length } from "class-validator";

import { BaseCategoryResponseDto } from "../category/category.dto";
import { LanguageResponseDto } from "../language/language.dto";

export class BaseCategoryTranslationResponseDto {
  @ApiProperty({
    description: "Unique identifier for the category translation",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "Name of the category translation in the specified language",
    example: "Electronics",
  })
  @Expose()
  name: string;

  @ApiProperty({
    description:
      "Description of the category translation in the specified language",
    example: "This is a category description.",
  })
  @Expose()
  description: string;

  constructor(data?: BaseCategoryTranslationResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class CategoryTranslationWithLanguageResponseDto extends BaseCategoryTranslationResponseDto {
  @ApiProperty({
    description: "Language details for the translation",
    type: () => LanguageResponseDto,
  })
  @Expose()
  language: LanguageResponseDto;

  constructor(data: CategoryTranslationWithLanguageResponseDto) {
    super(data);
    Object.assign(this, data);
  }
}

export class CategoryTranslationWithCategoryAndLanguageResponseDto extends BaseCategoryTranslationResponseDto {
  @ApiProperty({
    description: "Language details for the translation",
    type: () => LanguageResponseDto,
  })
  @Expose()
  language: LanguageResponseDto;

  @ApiPropertyOptional({
    description: "Category details for the translation",
    type: () => BaseCategoryResponseDto,
    nullable: true,
  })
  @Expose()
  category: BaseCategoryResponseDto | null;

  constructor(data: CategoryTranslationWithCategoryAndLanguageResponseDto) {
    super(data);
    Object.assign(this, data);
  }
}

export class CategoryTranslationRequestDto {
  @ApiProperty({
    description: "Name of the category translation in the specified language",
    example: "Electronics",
  })
  @IsString({ message: "Name must be a string." })
  @Length(1, 255, {
    message: "Name must be between 1 and 255 characters.",
  })
  name: string;

  @ApiProperty({
    description:
      "Description of the category translation in the specified language",
    example: "This is a category description.",
  })
  @IsString({ message: "Description must be a string." })
  description: string;

  @ApiProperty({
    description: "Language code (ISO 639-1)",
    example: "en",
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2, { message: "Language code must be exactly 2 characters." })
  languageId: string;

  @ApiProperty({
    description: "Unique identifier for the category",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsUUID(4, { message: "Category ID must be a valid UUID v4." })
  categoryId: string;

  constructor(data?: CategoryTranslationRequestDto) {
    if (data) Object.assign(this, data);
  }
}

export class CreateCategoryTranslationRequestDto extends CategoryTranslationRequestDto {}

export class UpdateCategoryTranslationRequestDto extends PartialType(
  CategoryTranslationRequestDto,
) {}
