export const VerificationCodeType = {
  REGISTER: "REGISTER",
  FORGOT_PASSWORD: "FORGOT_PASSWORD",
  LOGIN: "LOGIN",
  DISABLE_2FA: "DISABLE_2FA",
} as const;

export type VerificationCodeTypeType =
  (typeof VerificationCodeType)[keyof typeof VerificationCodeType];
