import { ApiProperty, PartialType, PickType } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { IsInt, IsNumber, IsString, IsUrl, IsUUID, Min } from "class-validator";

export class BaseSKUResponseDto {
  @ApiProperty({
    description: "Unique identifier for the SKU",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "SKU value",
  })
  @Expose()
  value: string;

  @ApiProperty({
    description: "Price of the SKU",
    example: 19.99,
  })
  @Expose()
  price: number;

  @ApiProperty({ description: "Stock quantity of the SKU", example: 100 })
  @Expose()
  stock: number;

  @ApiProperty({
    description: "Image URL of the SKU",
    example: "https://example.com/images/sku-image.png",
    format: "url",
  })
  @Expose()
  image: string;

  constructor(data?: BaseSKUResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class BaseSKURequestDto {
  @ApiProperty({
    description: "SKU value",
    example: "SKU-12345",
  })
  @IsString({ message: "SKU value must be a string." })
  @Transform(({ value }) => String(value).toLowerCase().trim())
  value: string;

  @ApiProperty({
    description: "Price of the SKU",
    example: 19.99,
  })
  @IsNumber({}, { message: "Price must be a number." })
  @Min(0, { message: "Price must be a non-negative number." })
  price: number;

  @ApiProperty({ description: "Stock quantity of the SKU", example: 100 })
  @IsNumber({}, { message: "Stock must be a number." })
  @Min(0, { message: "Stock must be a non-negative number." })
  @IsInt({ message: "Stock must be an integer." })
  stock: number;

  @ApiProperty({
    description: "Image URL of the SKU",
    example: "https://example.com/images/sku-image.png",
    format: "url",
  })
  @IsUrl({}, { message: "Image must be a valid URL." })
  image: string;

  @ApiProperty({
    description: "Product ID to which this SKU belongs",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsUUID("4", { message: "Product ID must be a valid UUID." })
  productId: string;
}

export class UpsertSKURequestDto extends PickType(BaseSKURequestDto, [
  "value",
  "price",
  "stock",
  "image",
] as const) {}

export class UpsertSKUWithIdRequestDto extends UpsertSKURequestDto {
  @ApiProperty({
    description: "Unique identifier for the SKU",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsUUID("4", { message: "SKU ID must be a valid UUID." })
  id: string;
}

export class CreateSKURequestDto extends BaseSKURequestDto {}

export class UpdateSKURequestDto extends PartialType(BaseSKURequestDto) {}
