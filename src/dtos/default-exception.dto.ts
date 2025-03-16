import { HttpStatus } from "@nestjs/common";

import { ErrorMessage } from "../constants/error-message.constant";

export class DefaultExceptionDto {
  statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

  messages?: string | { message: string; path: string }[] | object =
    ErrorMessage[HttpStatus.INTERNAL_SERVER_ERROR];
}
