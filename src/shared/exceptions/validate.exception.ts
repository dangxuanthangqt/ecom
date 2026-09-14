import { BadRequestException, HttpStatus } from "@nestjs/common";

import { ErrorCode } from "@/constants/error-code.constant";
import { ErrorDetailDto } from "@/dtos/error-detail.dto";

/**
 * Raised by the global `ValidationPipe` when a request body fails DTO validation.
 *
 * The payload handed to `super()` is already the response envelope, minus the
 * `requestId` the filter stamps on. Nest returns a non-array object payload from
 * `getResponse()` untouched, so no shape is re-derived downstream.
 */
export class ValidateException extends BadRequestException {
  constructor(details: ErrorDetailDto[], message = "Validation failed") {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      error: ErrorCode.VALIDATION_FAILED,
      message,
      details,
    });
  }
}
