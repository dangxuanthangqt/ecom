import { BadRequestException } from "@nestjs/common";
import { ErrorDetailDto } from "src/dtos/error-detail.dto";

import { ErrorMessage } from "@/constants/error-message.constant";

export class ValidateException extends BadRequestException {
  constructor(error: ErrorDetailDto[] | ErrorDetailDto, errorMessage?: string) {
    if (Array.isArray(error)) {
      super(error);
    } else if (error instanceof ErrorDetailDto) {
      super([error]);
    } else {
      const message = errorMessage ? errorMessage : ErrorMessage[error];

      const detail = {
        message: message || error,
      };
      super([detail]);
    }
  }
}
