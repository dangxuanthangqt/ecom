export const ErrorCode = {
  VALIDATE_COMMON: "V000",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
