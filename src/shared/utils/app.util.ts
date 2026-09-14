import { ValidationError } from "@nestjs/common";

import { ErrorDetailDto } from "src/dtos/error-detail.dto";

/**
 * Flattens class-validator's recursive `ValidationError` tree into one flat list,
 * one entry per failed constraint.
 *
 * Two properties matter to consumers:
 * - nested failures carry a dotted `field` path (`address.city`), so a client can
 *   address the offending input without walking a tree of its own;
 * - `code` is the constraint key (`isEmail`, `minLength`), which is stable across
 *   message and locale changes. It is the only part of a detail entry a client
 *   should branch on.
 */
export const transformValidateObject = (
  errors: ValidationError[],
): ErrorDetailDto[] => {
  const details: ErrorDetailDto[] = [];

  for (const error of errors) {
    collectInto(details, error);
  }

  return details;
};

function collectInto(
  details: ErrorDetailDto[],
  error: ValidationError,
  parentPath: string | null = null,
): void {
  const path = parentPath ? `${parentPath}.${error.property}` : error.property;

  if (error.constraints) {
    for (const code of Object.keys(error.constraints)) {
      details.push({
        field: path,
        code,
        message: error.constraints[code],
      });
    }
  }

  for (const child of error.children ?? []) {
    collectInto(details, child, path);
  }
}
