import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString, IsUUID, Length } from "class-validator";

import { BaseBrandResponseDto } from "../brand/brand.dto";
import { LanguageResponseDto } from "../language/language.dto";

export class BaseBrandTranslationDto {
  @ApiProperty({
    description: "Unique identifier for the brand translation",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "Name of the brand in the specified language",
    example: "Brand Name",
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: "Description of the brand in the specified language",
    example: "This is a brand description.",
  })
  @Expose()
  description: string;

  constructor(data?: BaseBrandTranslationDto) {
    if (data) Object.assign(this, data);
  }
}

export class BrandTranslationWithLanguageResponseDto extends BaseBrandTranslationDto {
  @ApiProperty({
    description: "Language details for the translation",
    type: () => LanguageResponseDto,
  })
  @Expose()
  language: LanguageResponseDto;

  constructor(data: BrandTranslationWithLanguageResponseDto) {
    super(data);
    Object.assign(this, data);
  }
}

export class BrandTranslationWithBrandAndLanguageResponseDto extends BaseBrandTranslationDto {
  @ApiProperty({
    description: "Language details for the translation",
    type: LanguageResponseDto,
  })
  @Expose()
  language: LanguageResponseDto;

  @ApiPropertyOptional({
    description: "Brand details for the translation",
    type: () => BaseBrandResponseDto,
    nullable: true,
  })
  @Expose()
  brand: BaseBrandResponseDto | null;

  constructor(data: BrandTranslationWithBrandAndLanguageResponseDto) {
    super(data);
    Object.assign(this, data);
  }
}

export class BrandTranslationRequestDto {
  @ApiProperty({
    description: "Name of the brand translation",
    example: "Brand Name",
  })
  @IsString({ message: "Name must be a string." })
  @Length(1, 255, {
    message: "Name must be between 1 and 255 characters long.",
  })
  name: string;

  @ApiProperty({
    description: "Description of the brand translation",
    example: "This is a brand description.",
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
    description: "ID of the brand for which the translation is created",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsUUID("4", {
    message: "Brand ID must be a valid UUID.",
  })
  brandId: string;

  constructor(data?: BrandTranslationRequestDto) {
    if (data) Object.assign(this, data);
  }
}

export class CreateBrandTranslationRequestDto extends BrandTranslationRequestDto {}

export class UpdateBrandTranslationRequestDto extends PartialType(
  BrandTranslationRequestDto,
) {}
