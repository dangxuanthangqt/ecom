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

import { ErrorCode } from "@/constants/error-codes";
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
 * @param code        the registered machine code for this rule. It lands on the
 *                    envelope's `error`, which is the field clients branch on, and
 *                    becomes the `details` entry's code too. Omit it only for
 *                    infrastructure failures a client cannot act on — `error` then
 *                    derives from the HTTP status as before.
 * @param message     English, for the log and as the client's fallback copy. Never
 *                    the thing a client should display once `code` is registered.
 * @param field       names the input the rule is about. It becomes one `details`
 *                    entry; omit it for failures not scoped to a field.
 * @param detailCode  overrides the `details` entry's code alone, for the rare entry
 *                    that carries a constraint name (`isEmail`) rather than a rule.
 */
function throwHttpException({
  type,
  code,
  message,
  field,
  detailCode,
}: {
  type: HttpErrorType;
  code?: ErrorCode;
  message: string;
  field?: string;
  detailCode?: string;
}): never {
  const statusCode = STATUS_BY_TYPE[type] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  const details: ErrorDetailDto[] = field
    ? [{ field, code: detailCode ?? code ?? "invalid", message }]
    : [];
  const payload = { statusCode, error: code, message, details };

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
