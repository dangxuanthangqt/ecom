import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";

import { ErrorDetailDto } from "@/dtos/error-detail.dto";

type HttpErrorType =
  | "badRequest"
  | "notFound"
  | "unprocessable"
  | "internal"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "tooManyRequests";

const STATUS_BY_TYPE: Record<HttpErrorType, HttpStatus> = {
  badRequest: HttpStatus.BAD_REQUEST,
  notFound: HttpStatus.NOT_FOUND,
  unprocessable: HttpStatus.UNPROCESSABLE_ENTITY,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  conflict: HttpStatus.CONFLICT,
  tooManyRequests: HttpStatus.TOO_MANY_REQUESTS,
  internal: HttpStatus.INTERNAL_SERVER_ERROR,
};

/**
 * Raises a business-rule failure already shaped as the API error envelope, so it
 * reaches the client exactly as a validation failure does. See
 * `docs/error-handling.md`.
 *
 * @param field  names the input the rule is about. It becomes one `details` entry;
 *               omit it for failures that are not scoped to a field.
 * @param code   the stable machine code for that entry. Defaults to `"invalid"`;
 *               pass something specific whenever the client must branch on it.
 * @param error  overrides the top-level machine code, which otherwise derives from
 *               the HTTP status.
 */
function throwHttpException({
  type,
  message,
  field,
  code = "invalid",
  error,
}: {
  type: HttpErrorType;
  message: string;
  field?: string;
  code?: string;
  error?: string;
}): never {
  const statusCode = STATUS_BY_TYPE[type] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  const details: ErrorDetailDto[] = field ? [{ field, code, message }] : [];
  const payload = { statusCode, error, message, details };

  throw buildException(type, payload, statusCode);
}

function buildException(
  type: HttpErrorType,
  payload: object,
  statusCode: HttpStatus,
): HttpException {
  switch (type) {
    case "badRequest":
      return new BadRequestException(payload);
    case "notFound":
      return new NotFoundException(payload);
    case "unprocessable":
      return new UnprocessableEntityException(payload);
    case "unauthorized":
      return new UnauthorizedException(payload);
    case "forbidden":
      return new ForbiddenException(payload);
    case "conflict":
      return new ConflictException(payload);
    case "tooManyRequests":
      return new HttpException(payload, HttpStatus.TOO_MANY_REQUESTS);
    case "internal":
      return new InternalServerErrorException(payload);
    default:
      // An unknown type is a programming error, not a client error — answer 500
      // rather than inventing a status for it.
      return new HttpException(payload, statusCode);
  }
}

export default throwHttpException;
