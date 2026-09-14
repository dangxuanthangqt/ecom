import { HttpStatus } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { errorCodeFromStatus } from "@/constants/error-code.constant";
import { defaultMessageForStatus } from "@/constants/error-message.constant";

import { ErrorDetailDto } from "./error-detail.dto";

/**
 * The single body shape for every error this API can produce. `GlobalExceptionFilter`
 * is the only writer; nothing else constructs an error response.
 */
export class ErrorResponseDto {
  @ApiProperty({ example: HttpStatus.BAD_REQUEST })
  statusCode: HttpStatus;

  @ApiProperty({
    example: "VALIDATION_FAILED",
    description: "Stable machine code. Safe to branch on; never localized.",
  })
  error: string;

  @ApiProperty({
    example: "Validation failed",
    description: "Always a string — never an array, never an object.",
  })
  message: string;

  @ApiProperty({
    type: () => [ErrorDetailDto],
    description:
      "Always present. Empty for failures that are not scoped to a field.",
  })
  details: ErrorDetailDto[];

  @ApiPropertyOptional({
    example: "3f1b2c8e-0e4a-4a1e-9f0c-2b7d0a1c5e64",
    description:
      "Correlates this response with the access log line for the same request.",
  })
  requestId?: string;

  constructor({
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    error,
    message,
    details,
    requestId,
  }: {
    statusCode?: HttpStatus;
    error?: string;
    message?: string;
    details?: ErrorDetailDto[];
    requestId?: string;
  } = {}) {
    this.statusCode = statusCode;
    this.error = error ?? errorCodeFromStatus(statusCode);
    this.message = message ?? defaultMessageForStatus(statusCode);
    this.details = details ?? [];
    this.requestId = requestId;
  }
}
