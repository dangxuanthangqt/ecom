import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

/**
 * Type guard to check if an error is a PrismaClientKnownRequestError.
 *
 * PrismaClientKnownRequestError is a specific type of error thrown by Prisma Client
 * when a known database-related issue occurs (e.g., unique constraint violation,
 * record not found). This function helps to narrow down the type of a generic
 * `error` to this specific Prisma error type.
 *
 * @param error - The error object to check.
 * @returns `true` if the error is an instance of PrismaClientKnownRequestError, `false` otherwise.
 */
export function isPrismaClientKnownRequestError(
  error: unknown,
): error is PrismaClientKnownRequestError {
  return error instanceof PrismaClientKnownRequestError;
}

/**
 * Type guard to check if an error is a Prisma unique constraint violation error (code P2002).
 *
 * This function builds upon `isPrismaClientKnownRequestError` to further verify if the
 * error is specifically due to a unique constraint violation in the database. This typically
 * occurs when attempting to create a record with a value that already exists in a unique field.
 *
 * @param error - The error object to check.
 * @returns `true` if the error is a PrismaClientKnownRequestError with code 'P2002', `false` otherwise.
 */
export function isUniqueConstraintPrismaError(
  error: unknown,
): error is PrismaClientKnownRequestError {
  return isPrismaClientKnownRequestError(error) && error.code === "P2002";
}

/**
 * Type guard to check if an error is a Prisma "record to update not found" error (code P2025).
 *
 * This function checks if a given error is a PrismaClientKnownRequestError and has the error
 * code 'P2025', which indicates that an attempt was made to update or delete a record that
 * does not exist in the database.
 *
 * @param error - The error object to check.
 * @returns `true` if the error is a PrismaClientKnownRequestError with code 'P2025', `false` otherwise.
 */
export function isRecordToUpdateNotFoundPrismaError(
  error: unknown,
): error is PrismaClientKnownRequestError {
  return isPrismaClientKnownRequestError(error) && error.code === "P2025";
}

/**
 * Type guard to check if an error is a Prisma foreign key constraint violation error (code P2003).
 *
 * This function checks if a given error is a PrismaClientKnownRequestError and has the error
 * code 'P2003', which indicates that an attempt was made to create or update a record in a way
 * that violates a foreign key constraint in the database. This typically occurs when trying to
 * reference a non-existent record in another table.
 *
 * @param error - The error object to check.
 * @returns `true` if the error is a PrismaClientKnownRequestError with code 'P2003', `false` otherwise.
 */
export function isForeignKeyConstraintPrismaError(
  error: unknown,
): error is PrismaClientKnownRequestError {
  return isPrismaClientKnownRequestError(error) && error.code === "P2003";
}

/**
 * Determines if the provided error is a Prisma "Record Not Found" error.
 *
 * This function checks if the given error is a `PrismaClientKnownRequestError`
 * and if its error code matches `P2025`, which indicates that a requested
 * record could not be found in the database.
 *
 * @param error - The error object to check.
 * @returns A boolean indicating whether the error is a "Record Not Found" error.
 */
export function isRecordNotFoundPrismaError(
  error: unknown,
): error is PrismaClientKnownRequestError {
  return isPrismaClientKnownRequestError(error) && error.code === "P2025";
}
