import { Expose, Type } from "class-transformer";
import { IsInt, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class PaginationResponseDto {
  @Expose()
  totalPages: number;

  @Expose()
  totalItems: number;

  @Expose()
  pageSize: number;

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
