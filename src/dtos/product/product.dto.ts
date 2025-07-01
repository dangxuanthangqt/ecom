import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  ValidateNested,
} from "class-validator";

import {
  BaseBrandResponseDto,
  BrandWithBrandTranslationsResponseDto,
} from "../brand/brand.dto";
import { BaseCategoryResponseDto } from "../category/category.dto";
import { BaseSKUResponseDto, UpsertKURequestDto } from "../sku/sku.dto";

import { IsUniqueVariant, IsValidSKUs } from "./product.validation";

import { IsUniqueStringArray } from "@/validations/decorators/is-unique-string-array";

export class VariantRequestDto {
  @ApiProperty({
    description: "Name of the variant",
    example: "Color",
  })
  @IsString({ message: "Variant name must be a string." })
  @Length(1, 255, {
    message: "Variant name must be between 1 and 255 characters.",
  })
  value: string;

  @ApiProperty({
    description: "List of options for the variant",
    example: ["Red", "Blue", "Green"],
    type: [String],
  })
  @IsArray({ message: "Options must be an array." })
  @IsString({ each: true, message: "Each option must be a string." })
  @IsUniqueStringArray({
    message: "All options must be unique. Duplicate options are not allowed.",
  })
  @ArrayMinSize(1, { message: "At least one option is required." })
  options: string[];
}
export class ProductRequestDto {
  @ApiPropertyOptional({
    description: "The date when the product will be published",
    example: "2023-10-01T00:00:00Z",
    format: "date-time",
    default: new Date().toISOString(),
  })
  @IsDateString({}, { message: "Invalid date format for publishAt" })
  publishAt: Date;

  @ApiProperty({
    description: "The name of the product",
    example: "Sample Product",
  })
  @IsString({ message: "Name must be a string" })
  @Length(1, 255, { message: "Name must be between 1 and 255 characters" })
  name: string;

  @ApiProperty({
    description: "Base price of the product",
    example: 100.0,
  })
  @IsNumber({}, { message: "Base price must be a number" })
  @IsPositive({ message: "Base price must be a positive number" })
  basePrice: number;

  @ApiProperty({
    description: "Virtual price of the product",
    example: 90.0,
  })
  @IsNumber({}, { message: "Virtual price must be a number" })
  @IsPositive({ message: "Virtual price must be a positive number" })
  virtualPrice: number;

  @ApiProperty({
    description: "Array of product image URLs",
    example: [
      "https://example.com/image1.jpg",
      "https://example.com/image2.png",
      "https://example.com/image3.webp",
    ],
    type: [String],
    isArray: true,
  })
  @IsArray({ message: "Images must be an array" })
  @ArrayMinSize(1, { message: "At least one image URL is required" })
  @ArrayMaxSize(10, { message: "Maximum 10 image URLs allowed" })
  @IsUrl(
    {},
    {
      each: true, // ← Key property: validate each item in array
      message: "Each image must be a valid URL",
    },
  )
  images: string[];

  @ApiProperty({
    description: "ID of the brand associated with the product",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsUUID("4", {
    message: "Brand ID must be a valid UUID.",
  })
  brandId: string;

  @ApiProperty({
    description: "List of variants for the product",
    type: [VariantRequestDto],
  })
  @ValidateNested({ each: true })
  @Type(() => VariantRequestDto)
  @IsUniqueVariant()
  @IsArray({ message: "Variants must be an array." })
  variants: VariantRequestDto[];

  @ApiProperty({
    description: "List of category IDs associated with the product",
    example: [
      "123e4567-e89b-12d3-a456-426614174000",
      "123e4567-e89b-12d3-a456-426614174001",
    ],
    type: [String],
  })
  @IsUUID("4", {
    each: true,
    message: "Each category ID must be a valid UUID.",
  })
  @IsArray({ message: "Category IDs must be an array." })
  categoryIds: string[];

  @ApiProperty({
    description: "List of SKUs for the product",
    type: [UpsertKURequestDto],
  })
  @ValidateNested({ each: true })
  @Type(() => UpsertKURequestDto)
  @IsValidSKUs()
  skus: UpsertKURequestDto[];
}

export class CreateProductRequestDto extends ProductRequestDto {}

export class VariantResponseDto {
  @ApiProperty({
    description: "Name of the variant",
    example: "Color",
  })
  @Expose()
  value: string;

  @ApiProperty({
    description: "List of options for the variant",
    example: ["Red", "Blue", "Green"],
    type: [String],
  })
  @Expose()
  options: string[];

  constructor(data?: VariantResponseDto) {
    if (data) {
      Object.assign(this, data);
    }
  }
}

export class ProductResponseDto {
  @ApiProperty({
    description: "Unique identifier of the product",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: " Publish date of the product",
    example: "2023-10-01T00:00:00Z",
    format: "date-time",
    nullable: true,
  })
  @Expose()
  publishAt: Date | null;

  @ApiProperty({
    description: "Name of the product",
    example: "Sample Product",
  })
  name: string;

  @ApiProperty({
    description: "Base price of the product",
    example: 100.0,
  })
  @Expose()
  basePrice: number;

  @ApiProperty({
    description: "Virtual price of the product",
    example: 90.0,
  })
  @Expose()
  virtualPrice: number;

  @ApiProperty({
    description: "Array of product image URLs",
    example: [
      "https://example.com/image1.jpg",
      "https://example.com/image2.png",
      "https://example.com/image3.webp",
    ],
    type: [String],
    isArray: true,
  })
  @Expose()
  images: string[];

  @ApiPropertyOptional({
    description: "Brand details associated with the product",
    type: () => BaseBrandResponseDto,
    nullable: true,
  })
  @Expose()
  brand: BrandWithBrandTranslationsResponseDto | null;

  @ApiProperty({
    description: "List of variants for the product",
    type: () => [VariantResponseDto],
    isArray: true,
  })
  @Expose()
  variants: VariantResponseDto[];
}

export class ProductDetailResponseDto extends ProductResponseDto {
  @ApiProperty({
    description: " Categories associated with the product",
    type: () => [BaseCategoryResponseDto],
    isArray: true,
    nullable: true,
  })
  @Expose()
  categories: BaseCategoryResponseDto[];

  @ApiProperty({
    description: "List of product translations in different languages",
    type: () => [BaseSKUResponseDto],
    isArray: true,
  })
  @Expose()
  skus: BaseSKUResponseDto[];

  constructor(data?: ProductDetailResponseDto) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

export class DeleteProductResponseDto {
  @ApiProperty({
    description: "Message indicating the result of the delete operation",
    example: "Product deleted successfully",
  })
  message: string;

  constructor(data?: DeleteProductResponseDto) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
