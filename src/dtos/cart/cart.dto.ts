import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsUUID, Min } from "class-validator";

import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";

import { CartItemOrderByFields, CartItemOrderByFieldsType } from "./constant";

export class CartItemProductSummaryResponseDto {
  @ApiProperty({
    description: "Unique identifier of the parent product",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({ description: "Name of the parent product" })
  @Expose()
  name: string;

  constructor(data?: CartItemProductSummaryResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class CartItemSkuResponseDto {
  @ApiProperty({ description: "Unique identifier of the SKU", format: "uuid" })
  @Expose()
  id: string;

  @ApiProperty({ description: "Display order of the SKU" })
  @Expose()
  order: number;

  @ApiProperty({ description: "Image URL of the SKU" })
  @Expose()
  image: string;

  @ApiProperty({ description: "Price of the SKU" })
  @Expose()
  price: number;

  @ApiProperty({ description: "Remaining stock for the SKU" })
  @Expose()
  stock: number;

  @ApiProperty({ description: "SKU value, e.g. size or color" })
  @Expose()
  value: string;

  @ApiProperty({ type: CartItemProductSummaryResponseDto })
  @Expose()
  @Type(() => CartItemProductSummaryResponseDto)
  product: CartItemProductSummaryResponseDto;

  constructor(data?: CartItemSkuResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class BaseCartItemResponseDto {
  @ApiProperty({
    description: "Unique identifier of the cart line",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({ description: "Quantity of the SKU held in the cart" })
  @Expose()
  quantity: number;

  @ApiProperty({ description: "When the cart line was created" })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: "When the cart line was last updated" })
  @Expose()
  updatedAt: Date;

  constructor(data?: BaseCartItemResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class CartItemDetailResponseDto extends BaseCartItemResponseDto {
  @ApiProperty({ type: CartItemSkuResponseDto })
  @Expose()
  @Type(() => CartItemSkuResponseDto)
  sku: CartItemSkuResponseDto;

  constructor(data?: CartItemDetailResponseDto) {
    super(data);
    if (data) Object.assign(this, data);
  }
}

export class AddCartItemRequestDto {
  @ApiProperty({
    description: "The SKU to add to the cart",
    format: "uuid",
  })
  @IsUUID("4", { message: "SKU ID must be a valid UUID." })
  skuId: string;

  @ApiProperty({ description: "Quantity to add", example: 1, minimum: 1 })
  @IsInt({ message: "Quantity must be an integer." })
  @Min(1, { message: "Quantity must be at least 1." })
  quantity: number;
}

export class UpdateCartItemRequestDto {
  @ApiProperty({
    description: "New quantity for the cart line",
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: "Quantity must be an integer." })
  @Min(1, { message: "Quantity must be at least 1." })
  quantity: number;
}

export class CartItemIdParamDto {
  @ApiProperty({
    description: "Unique identifier of the cart line",
    format: "uuid",
  })
  @IsUUID("4", { message: "Cart item ID must be a valid UUID." })
  cartItemId: string;
}

export class DeleteCartItemResponseDto {
  @ApiProperty({ example: "Cart item removed successfully." })
  @Expose()
  message: string;

  constructor(data: DeleteCartItemResponseDto) {
    Object.assign(this, data);
  }
}

export class CartPaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Field to order by",
    example: CartItemOrderByFields.CREATED_AT,
    enum: Object.values(CartItemOrderByFields),
  })
  @IsIn(Object.values(CartItemOrderByFields), {
    message: `orderBy must be one of: ${Object.values(CartItemOrderByFields).join(", ")}`,
  })
  @IsOptional()
  orderBy?: CartItemOrderByFieldsType;
}
