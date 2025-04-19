import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsInt, IsOptional, IsPositive, IsString, Min } from "class-validator";

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

export class PaginationRequestParamsDto {
  @IsInt({ message: "pageSize must be an integer" })
  @IsPositive({ message: "pageSize must be greater than 0" })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsInt({ message: "pageIndex must be an integer" })
  @Min(0, { message: "pageIndex must be 0 or greater." })
  @IsOptional()
  @Type(() => Number)
  pageIndex?: number;

  @IsString({ message: "order must be a string." })
  @IsOptional()
  order?: "ASC" | "DESC"; // Restrict to valid values

  @IsString({ message: "orderBy must be a string." })
  @IsOptional()
  orderBy?: string;

  @IsString({ message: "Keyword must be a string." })
  @IsOptional()
  keyword?: string;
}
