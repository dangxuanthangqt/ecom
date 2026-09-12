import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client";
import { Expose, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
} from "class-validator";

import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";

import { OrderOrderByFields, OrderOrderByFieldsType } from "./constant";

export class ProductSkuSnapshotResponseDto {
  @ApiProperty({
    description: "Unique identifier of the snapshot line",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({ description: "Product name frozen at purchase time" })
  @Expose()
  productName: string;

  @ApiProperty({ description: "Unit price frozen at purchase time" })
  @Expose()
  price: number;

  @ApiProperty({
    description: "Product images frozen at purchase time",
    type: [String],
  })
  @Expose()
  images: string[];

  @ApiProperty({
    description: "SKU value (e.g. size, color) frozen at purchase time",
  })
  @Expose()
  skuValue: string;

  @ApiProperty({ description: "Quantity purchased on this line" })
  @Expose()
  quantity: number;

  constructor(data?: ProductSkuSnapshotResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class BaseOrderResponseDto {
  @ApiProperty({
    description: "Unique identifier of the order",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({ description: "Current order status", enum: OrderStatus })
  @Expose()
  status: OrderStatus;

  @ApiProperty({ description: "When the order was placed" })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: "When the order was last updated" })
  @Expose()
  updatedAt: Date;

  constructor(data?: BaseOrderResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class OrderDetailResponseDto extends BaseOrderResponseDto {
  @ApiProperty({ type: [ProductSkuSnapshotResponseDto] })
  @Expose()
  @Type(() => ProductSkuSnapshotResponseDto)
  items: ProductSkuSnapshotResponseDto[];

  constructor(data?: OrderDetailResponseDto) {
    super(data);
    if (data) Object.assign(this, data);
  }
}

export class CancelOrderResponseDto extends BaseOrderResponseDto {
  constructor(data?: CancelOrderResponseDto) {
    super(data);
  }
}

export class CreateOrderRequestDto {
  @ApiProperty({
    description: "Cart line ids to convert into orders (one per seller)",
    type: [String],
    example: ["11111111-1111-4111-8111-111111111111"],
  })
  @IsArray({ message: "cartItemIds must be an array." })
  @ArrayNotEmpty({ message: "cartItemIds must not be empty." })
  @ArrayMaxSize(50, { message: "cartItemIds must contain at most 50 items." })
  @IsUUID("4", {
    each: true,
    message: "Each cart item id must be a valid UUID.",
  })
  cartItemIds: string[];
}

export class OrderQueryDto {
  @ApiPropertyOptional({
    description: "Filter by order status",
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: "status must be a valid OrderStatus." })
  status?: OrderStatus;
}

export class OrderPaginationQueryDto extends IntersectionType(
  PaginationQueryDto,
  OrderQueryDto,
) {
  @ApiPropertyOptional({
    description: "Field to order by",
    example: OrderOrderByFields.CREATED_AT,
    enum: Object.values(OrderOrderByFields),
  })
  @IsIn(Object.values(OrderOrderByFields), {
    message: `orderBy must be one of: ${Object.values(OrderOrderByFields).join(", ")}`,
  })
  @IsOptional()
  orderBy?: OrderOrderByFieldsType;
}
