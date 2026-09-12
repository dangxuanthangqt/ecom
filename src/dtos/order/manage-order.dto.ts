import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client";
import { IsEnum, IsIn, IsOptional, IsUUID } from "class-validator";

import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";

import { OrderOrderByFields, OrderOrderByFieldsType } from "./constant";
import { OrderDetailResponseDto } from "./order.dto";

/** Seller/admin status transition body (BR-O05). */
export class UpdateOrderStatusRequestDto {
  @ApiProperty({
    description: "The next order status to transition to",
    enum: OrderStatus,
  })
  @IsEnum(OrderStatus, { message: "status must be a valid OrderStatus." })
  status: OrderStatus;
}

export class ManageOrderQueryDto {
  @ApiPropertyOptional({
    description: "Filter by order status",
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: "status must be a valid OrderStatus." })
  status?: OrderStatus;

  @ApiPropertyOptional({
    description:
      "Filter by the seller who owns the order's products (admin only; ignored for seller callers, whose own id always scopes the query)",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID("4", { message: "createdById must be a valid UUID." })
  createdById?: string;
}

export class ManageOrderPaginationQueryDto extends IntersectionType(
  ManageOrderQueryDto,
  PaginationQueryDto,
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

/** Distinct swagger model for the manage-order detail response. */
export class ManageOrderDetailResponseDto extends OrderDetailResponseDto {
  constructor(data?: ManageOrderDetailResponseDto) {
    super(data);
  }
}
