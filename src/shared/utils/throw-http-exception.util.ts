import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  InternalServerErrorException,
  HttpException,
} from "@nestjs/common";

interface HttpExceptionDetail {
  message: string;
  field?: string;
}

type HttpErrorType = "badRequest" | "notFound" | "unprocessable" | "internal";

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
    case "internal":
    default:
      exception = new InternalServerErrorException(detail);
      break;
  }

  throw exception;
}

export default throwHttpException;
