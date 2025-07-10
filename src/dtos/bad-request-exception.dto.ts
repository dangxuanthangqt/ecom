import { HttpStatus } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

export class BadRequestErrorDetailDto {
  @ApiProperty()
  field: string;

  @ApiProperty()
  message: string;

  constructor({ field, message }: { field: string; message: string }) {
    this.field = field;
    this.message = message;
  }
}

export class BadRequestExceptionDto {
  @ApiProperty()
  statusCode: HttpStatus;

  @ApiProperty({
    type: () => [BadRequestErrorDetailDto],
  })
  message: BadRequestErrorDetailDto[];

  constructor({
    statusCode,
    message,
  }: {
    statusCode: HttpStatus;
    message: BadRequestErrorDetailDto[];
  }) {
    this.statusCode = statusCode;
    this.message = message;
  }
}
