import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { PaginationResponseDto } from "./pagination.dto";

export class PageDto<T> {
  @Expose()
  data: T[];

  @Expose()
  @ApiProperty()
  pagination: PaginationResponseDto;

  constructor({
    data,
    pagination,
  }: {
    data: T[];
    pagination: PaginationResponseDto;
  }) {
    this.data = data;
    this.pagination = pagination;
  }
}
