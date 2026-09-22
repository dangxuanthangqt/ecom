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

import { ErrorCode } from "@/constants/error-codes";
import { ErrorResponseDto } from "@/dtos/error-response.dto";
import { PageDto } from "@/dtos/shared/page.dto";

/**
 * The response options every error answer shares.
 *
 * `type` — not `schema` — is what registers `ErrorResponseDto` in
 * `components/schemas`, and registering it is what publishes the `error` enum to
 * generated clients. Handing Swagger only `schema.example` gives it a plain
 * object, so the class's `@ApiProperty` metadata, enum included, is never read
 * and every error types as `unknown` downstream.
 */
const errorResponse = (
  statusCode: HttpStatus,
  overrides: Partial<ErrorResponseDto> = {},
) => ({
  type: ErrorResponseDto,
  example: new ErrorResponseDto({ statusCode, ...overrides }),
});

/** The one worked example: a field-scoped validation failure. */
const VALIDATION_EXAMPLE: Partial<ErrorResponseDto> = {
  error: ErrorCode.VALIDATION_FAILED,
  message: "Validation failed",
  details: [
    { field: "email", code: "isEmail", message: "email must be an email" },
  ],
};

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
      ...errorResponse(HttpStatus.UNAUTHORIZED),
    }),
    ApiForbiddenResponse({
      description: "Forbidden",
      ...errorResponse(HttpStatus.FORBIDDEN),
    }),
    ApiInternalServerErrorResponse({
      description: "Internal Server Error",
      ...errorResponse(HttpStatus.INTERNAL_SERVER_ERROR),
    }),
    ApiBadRequestResponse({
      description: "Bad Request",
      ...errorResponse(HttpStatus.BAD_REQUEST, VALIDATION_EXAMPLE),
    }),
    ApiUnprocessableEntityResponse({
      description: "Unprocessable Entity",
      ...errorResponse(HttpStatus.UNPROCESSABLE_ENTITY),
    }),
    ApiNotFoundResponse({
      description: "Not Found",
      ...errorResponse(HttpStatus.NOT_FOUND),
    }),
    ApiOperation({ summary: options?.summary }),
  ];

  arrDecorator.push(
    ApiOkResponse({
      type,
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
      type,
      description: options?.description ?? "OK",
    }),
    ApiInternalServerErrorResponse({
      description: "Internal Server Error",
      ...errorResponse(HttpStatus.INTERNAL_SERVER_ERROR),
    }),
    ApiUnprocessableEntityResponse({
      description: "Unprocessable Entity",
      ...errorResponse(HttpStatus.UNPROCESSABLE_ENTITY),
    }),
    ApiBadRequestResponse({
      description: "Bad Request",
      ...errorResponse(HttpStatus.BAD_REQUEST, VALIDATION_EXAMPLE),
    }),
    ApiNotFoundResponse({
      description: "Not Found",
      ...errorResponse(HttpStatus.NOT_FOUND),
    }),
    ApiOperation({ summary: options?.summary }),
    HttpCode(statusCode),
  );
}

export function ApiPageOkResponse<T extends Type>(options: {
  type: T;
  description?: string;
  summary?: string;
  isPublic?: boolean;
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

        /**
        Example response in Swagger file

        allOf:
          - $ref: "#/components/schemas/PageDto"
          - properties:
              data:
                type: array
                items:
                  $ref: "#/components/schemas/PermissionWithRolesResponseDto"
            required:
              - data

              => link correctly type in Swagger UI
        */
      },
    }),
    ApiOperation({ summary: options.summary }),
  ];

  const arrHeader: ApiHeaderOptions[] = options.isPublic
    ? []
    : [
        {
          name: "Authorization",
          required: true,
          description: "Bearer auth token",
        },
      ];

  return applyDecorators(...arrDecorator, ApiHeaders(arrHeader));
}

/* Những DTO nào sẽ xuất hiện trong Schemas ở endpoint Swagger UI:
1. Tự động xuất hiện (không cần config):
- DTOs được sử dụng trong @ApiResponse(), @ApiOkResponse()
- DTOs được sử dụng làm @Body() trong controllers
- DTOs được sử dụng làm return type của controllers
2. Cần config thủ công:
- DTOs được sử dụng gián tiếp (nested objects)
- Generic DTOs như PageDto<T>
- ApiExtraModels trong NestJS Swagger được dùng để đăng ký các DTO models vào Swagger schemas mà không được tự động phát hiện

@ApiExtraModels(PageDto, PaginationResponseDto)
@Controller('brands')
export class BrandController {
  // Các DTOs này sẽ xuất hiện trong Swagger Schemas
}

*/
