import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from "class-validator";

import { ORDER } from "@/constants/order";

export class PaginationResponseDto {
  @ApiProperty({ description: "Total number of pages", example: 5 })
  @Expose()
  totalPages: number;

  @ApiProperty({ description: "Total number of items", example: 100 })
  @Expose()
  totalItems: number;

  @ApiProperty({ description: "Number of items per page", example: 20 })
  @Expose()
  pageSize: number;

  @ApiProperty({
    description: "Current page index (starts from 0)",
    example: 0,
  })
  @Expose()
  pageIndex: number;

  constructor(partial: Partial<PaginationResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: "Number of items per page", example: 20 })
  @IsInt({ message: "pageSize must be an integer" })
  @IsPositive({ message: "pageSize must be greater than 0" })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({
    description: "Page index (starts from 0)",
    example: 0,
  })
  @IsInt({ message: "pageIndex must be an integer" })
  @Min(0, { message: "pageIndex must be 0 or greater." })
  @IsOptional()
  pageIndex?: number;

  @ApiPropertyOptional({
    description: "Sort order",
    enum: [ORDER.ASC, ORDER.DESC],
    example: ORDER.ASC,
  })
  @IsString({ message: "order must be a string." })
  @IsOptional()
  @IsIn([ORDER.ASC, ORDER.DESC], {
    message: `order must be one of the following values: ${ORDER.ASC}, ${ORDER.DESC}`,
  })
  order?: "ASC" | "DESC";

  @ApiPropertyOptional({ description: "Field to order by", example: "name" })
  @IsString({ message: "orderBy must be a string." })
  @IsOptional()
  orderBy?: string;

  @ApiPropertyOptional({ description: "Search keyword", example: "admin" })
  @IsString({ message: "Keyword must be a string." })
  @IsOptional()
  keyword?: string;
}
