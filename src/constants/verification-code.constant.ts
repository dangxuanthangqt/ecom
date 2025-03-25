export const VerificationCodeType = {
  REGISTER: "REGISTER",
  FORGOT_PASSWORD: "FORGOT_PASSWORD",
} as const;

export type VerificationCodeTypeType =
  (typeof VerificationCodeType)[keyof typeof VerificationCodeType];
