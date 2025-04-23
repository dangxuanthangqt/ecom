import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  InternalServerErrorException,
  HttpException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";

interface HttpExceptionDetail {
  message: string;
  field?: string;
}

type HttpErrorType =
  | "badRequest"
  | "notFound"
  | "unprocessable"
  | "internal"
  | "unauthorized"
  | "forbidden";

function throwHttpException({
  type,
  message,
  field,
}: {
  type: HttpErrorType;
  message: string;
  field?: string;
}): never {
  const detail: HttpExceptionDetail = { message, field };
  let exception: HttpException;

  switch (type) {
    case "badRequest":
      exception = new BadRequestException([detail]);
      break;

    case "notFound":
      exception = new NotFoundException(detail);
      break;

    case "unprocessable":
      exception = new UnprocessableEntityException(detail);
      break;

    case "unauthorized":
      exception = new UnauthorizedException(detail);
      break;

    case "forbidden":
      exception = new ForbiddenException(detail);
      break;

    case "internal":
    default:
      exception = new InternalServerErrorException(detail);
      break;
  }

  throw exception;
}

export default throwHttpException;
