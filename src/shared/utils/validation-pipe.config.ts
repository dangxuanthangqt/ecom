import {
  HttpStatus,
  ValidationPipe,
  ValidationPipeOptions,
} from "@nestjs/common";

import { ValidateException } from "../exceptions/validate.exception";

import { transformValidateObject } from "./app.util";

/**
 * The one validation-pipe configuration. `main.ts` and the e2e harness both build
 * from this, so a spec asserting an error body can never drift from production.
 */
export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  errorHttpStatusCode: HttpStatus.BAD_REQUEST,
  exceptionFactory: (errors) =>
    new ValidateException(transformValidateObject(errors)),
};

export const createValidationPipe = (): ValidationPipe =>
  new ValidationPipe(validationPipeOptions);
