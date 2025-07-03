import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString, IsUUID, Length } from "class-validator";

import { LanguageResponseDto } from "../language/language.dto";

export class ProductTranslationResponseDto {
  @ApiProperty({
    description: "The unique identifier of the product translation.",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "The name of the product in the specified language.",
    example: "Product Name",
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: "The description of the product in the specified language.",
    example: "This is a product description.",
  })
  @Expose()
  description: string;

  @ApiProperty({
    description: "The language of the product translation.",
    type: () => LanguageResponseDto,
  })
  @Expose()
  language: LanguageResponseDto;

  constructor(data?: ProductTranslationResponseDto) {
    if (data) {
      Object.assign(this, data);
    }
  }
}

export class BaseProductTranslationRequestDto {
  @ApiProperty({
    description: "The name of the product translation.",
    example: "Product Name",
  })
  @IsString({
    message: "Name must be a string",
  })
  @Length(1, 255, {
    message: "Name must be between 1 and 255 characters",
  })
  name: string;

  @ApiProperty({
    description: "The description of the product translation.",
    example: "This is a product description.",
  })
  @IsString({
    message: "Description must be a string",
  })
  description: string;

  @ApiProperty({
    description: "The language code for the product translation.",
    example: "en",
  })
  @IsString({
    message: "Language code must be a string",
  })
  @Length(2, 2, {
    message: "Language code must be exactly 2 characters",
  })
  languageId: string;

  @ApiProperty({
    description: "The unique identifier of the product.",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsString({
    message: "Product ID must be a string",
  })
  @IsUUID(4, {
    message: "Product ID must be a valid UUID v4",
  })
  productId: string;
}

export class CreateProductTranslationRequestDto extends BaseProductTranslationRequestDto {}

export class UpdateProductTranslationRequestDto extends PartialType(
  BaseProductTranslationRequestDto,
) {}
