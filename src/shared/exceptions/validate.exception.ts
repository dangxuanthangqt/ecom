import { BadRequestException } from "@nestjs/common";
import { ErrorDetailDto } from "src/dtos/error-detail.dto";

import { ErrorCode, ErrorCodeType } from "@/constants/error-code.constant";
import { ErrorMessage } from "@/constants/error-message.constant";

export class ValidateException extends BadRequestException {
  constructor(
    error: ErrorDetailDto[] | ErrorDetailDto | ErrorCodeType,
    errorMessage?: string,
  ) {
    if (Array.isArray(error)) {
      super(error);
    } else if (error instanceof ErrorDetailDto) {
      super([error]);
    } else {
      const message = errorMessage ? errorMessage : ErrorMessage[error];

      const errorCode: ErrorCodeType = message
        ? (error as ErrorCodeType)
        : ErrorCode.VALIDATE_COMMON;

      const detail = {
        errorCode: errorCode,
        errorMessage: message || error,
      };
      super([detail]);
    }
  }
}
