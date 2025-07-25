import { ValidationError } from "@nestjs/common";

import { ErrorDetailDto } from "src/dtos/error-detail.dto";

export const transformValidateObject = (
  errors: ValidationError[],
): ErrorDetailDto[] => {
  const details: ErrorDetailDto[] = extractErrorDetails(errors);

  return details;
};

function extractErrorDetails(errors: ValidationError[]): ErrorDetailDto[] {
  const errorDetails: ErrorDetailDto[] = [];

  function recursiveExtract(
    error: ValidationError,
    property: string | null = null,
  ) {
    if (error.constraints) {
      for (const constraint in error.constraints) {
        errorDetails.push({
          field: property ? `${property}.${error.property}` : error.property,
          // errorCode: constraint,
          message: error.constraints[constraint],
        });
      }
    }

    if (error.children) {
      for (const childError of error.children) {
        recursiveExtract(
          childError,
          property ? `${property}.${error.property}` : error.property,
        );
      }
    }
  }

  for (const error of errors) {
    recursiveExtract(error);
  }

  return errorDetails;
}
