import { applyDecorators, HttpCode, HttpStatus, Type } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiHeaderOptions,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponseCommonMetadata,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from "@nestjs/swagger";

import { BadRequestExceptionDto } from "@/dto/bad-request-exception.dto";
import { DefaultExceptionDto } from "@/dto/default-exception.dto";
import { PageDto } from "@/dto/shared/page.dto";

export function ApiAuth({
  type,
  options,
  statusCode = HttpStatus.OK,
}: {
  type: ApiResponseCommonMetadata["type"];
  options?: {
    summary: string;
    description?: string;
    isArray?: boolean;
  };
  statusCode?: HttpStatus;
}): MethodDecorator {
  const arrDecorator = [
    ApiUnauthorizedResponse({
      description: "Unauthorized",
      schema: {
        example: new DefaultExceptionDto({
          statusCode: HttpStatus.UNAUTHORIZED,
        }),
      },
    }),
    ApiForbiddenResponse({
      description: "Forbidden",
      schema: {
        example: new DefaultExceptionDto({
          statusCode: HttpStatus.FORBIDDEN,
        }),
      },
    }),
    ApiInternalServerErrorResponse({
      description: "Internal Server Error",
      schema: {
        example: new DefaultExceptionDto({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        }),
      },
    }),
    ApiBadRequestResponse({
      description: "Bad Request",
      schema: {
        example: new BadRequestExceptionDto({
          statusCode: HttpStatus.BAD_REQUEST,
          message: [
            {
              field: "field",
              message: "message",
            },
          ],
        }),
      },
    }),
    ApiUnprocessableEntityResponse({
      description: "Unprocessable Entity",
      schema: {
        example: new DefaultExceptionDto({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
      },
    }),
    ApiNotFoundResponse({
      description: "Not Found",
      schema: {
        example: new DefaultExceptionDto({
          statusCode: HttpStatus.NOT_FOUND,
        }),
      },
    }),
    ApiOperation({ summary: options?.summary }),
  ];

  arrDecorator.push(
    ApiOkResponse({
      type: type,
      description: options?.description ?? "OK",
      isArray: options?.isArray,
    }),
  );

  const arrHeader: ApiHeaderOptions[] = [
    {
      name: "Authorization",
      required: true,
      description: "Bearer auth token",
    },
  ];

  return applyDecorators(
    ...arrDecorator,
    ApiHeaders(arrHeader),
    HttpCode(statusCode),
  );
}

export function ApiPublic({
  type,
  options,
  statusCode = HttpStatus.OK,
}: {
  type?: ApiResponseCommonMetadata["type"];
  options?: {
    summary: string;
    description?: string;
  };
  statusCode?: HttpStatus;
}): MethodDecorator {
  return applyDecorators(
    ApiOkResponse({
      type: type,
      description: options?.description ?? "OK",
    }),
    ApiInternalServerErrorResponse({
      description: "Internal Server Error",
      schema: {
        example: new DefaultExceptionDto({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        }),
      },
    }),
    ApiUnprocessableEntityResponse({
      description: "Unprocessable Entity",
      schema: {
        example: new DefaultExceptionDto({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
      },
    }),
    ApiBadRequestResponse({
      description: "Bad Request",
      schema: {
        example: new BadRequestExceptionDto({
          statusCode: HttpStatus.BAD_REQUEST,
          message: [
            {
              field: "field",
              message: "message",
            },
          ],
        }),
      },
    }),
    ApiNotFoundResponse({
      description: "Not Found",
      schema: {
        example: new DefaultExceptionDto({
          statusCode: HttpStatus.NOT_FOUND,
        }),
      },
    }),
    ApiOperation({ summary: options?.summary }),
    HttpCode(statusCode),
  );
}

export function ApiPageOkResponse<T extends Type>(options: {
  type: T;
  description?: string;
  summary?: string;
}): MethodDecorator {
  const arrDecorator = [
    ApiExtraModels(PageDto),
    ApiExtraModels(options.type),
    ApiOkResponse({
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PageDto) },
          {
            properties: {
              data: {
                type: "array",
                items: { $ref: getSchemaPath(options.type) },
              },
            },
            required: ["data"],
          },
        ],
      },
    }),
    ApiOperation({ summary: options.summary }),
  ];

  const arrHeader: ApiHeaderOptions[] = [
    {
      name: "Authorization",
      required: true,
      description: "Bearer auth token",
    },
  ];

  return applyDecorators(...arrDecorator, ApiHeaders(arrHeader));
}
