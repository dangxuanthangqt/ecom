/**
 * File upload and object-storage failures.
 *
 * These carry their limits in the message (`maximum size of 5242880 bytes`) and
 * the offending input in `details[].field`, so a client can put the complaint on
 * the right file in a multi-file form.
 */
export const UploadErrorCode = {
  FILE_REQUIRED: "FILE_REQUIRED",
  FILE_COUNT_EXCEEDED: "FILE_COUNT_EXCEEDED",
  FILE_COUNT_TOO_FEW: "FILE_COUNT_TOO_FEW",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  FILE_TOO_SMALL: "FILE_TOO_SMALL",
  FILE_TOTAL_SIZE_EXCEEDED: "FILE_TOTAL_SIZE_EXCEEDED",
  FILE_TYPE_INVALID: "FILE_TYPE_INVALID",
  FILE_EXTENSION_INVALID: "FILE_EXTENSION_INVALID",
  FILE_NAME_INVALID: "FILE_NAME_INVALID",
  FILE_NAME_TOO_LONG: "FILE_NAME_TOO_LONG",
  /** A multipart field arrived that the endpoint does not accept. */
  FILE_FIELD_UNEXPECTED: "FILE_FIELD_UNEXPECTED",

  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  FILE_ALREADY_EXISTS: "FILE_ALREADY_EXISTS",
  FILE_EMPTY: "FILE_EMPTY",
  /** The path resolved to a directory where a file was required. */
  PATH_NOT_A_FILE: "PATH_NOT_A_FILE",
} as const;
