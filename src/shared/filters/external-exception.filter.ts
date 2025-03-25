import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { ZodSerializationException, ZodValidationException } from "nestjs-zod";
import { DefaultExceptionDto } from "src/dtos/default-exception.dto";

interface HttpExceptionResponse {
  statusCode: number;
  message: unknown;
  error: string;
}

@Catch(HttpException)
export class ExternalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ExternalExceptionFilter.name);
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();

    const defaultExceptionDto = new DefaultExceptionDto();

    /** Test with zod */
    if (
      exception instanceof ZodValidationException ||
      exception instanceof ZodSerializationException
    ) {
      const zodError = exception.getZodError();
      this.logger.error(`ZodSerializationException: ${zodError.message}`);

      defaultExceptionDto.statusCode = exception.getStatus();
      defaultExceptionDto.messages = zodError.message;
    }

    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse() as HttpExceptionResponse;

      const errorMessage = errorResponse.message || exception.message;

      defaultExceptionDto.statusCode = exception.getStatus();
      defaultExceptionDto.messages = errorMessage;
    }

    const logMessage = `${exception.constructor.name} occurred at ${new Date().toISOString()} - Status: ${defaultExceptionDto.statusCode}, Message: ${JSON.stringify(defaultExceptionDto.messages)}`;

    this.logger.error(logMessage);
    // this.logger.error([logMessage, exception.stack]);
    // exception.stack is very long, log it if needed

    response.status(defaultExceptionDto.statusCode).json(defaultExceptionDto);
  }
}
