import { HttpStatus } from "@nestjs/common";

import { ErrorMessage } from "../constants/error-message.constant";

export class DefaultExceptionDto {
  statusCode: HttpStatus;

  message?: string;

  constructor(
    {
      statusCode,
      message,
    }: {
      statusCode: HttpStatus;
      message?: string;
    } = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
  ) {
    this.statusCode = statusCode;
    this.message =
      message ||
      ErrorMessage[statusCode as keyof typeof ErrorMessage] ||
      "An error occurred.";
  }
}
