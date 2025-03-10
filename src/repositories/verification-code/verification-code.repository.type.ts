import { VerificationCode } from "@prisma/client";

export type VerificationCodeInputData = Pick<
  VerificationCode,
  "code" | "email" | "type" | "expiresAt"
>;

export type VerificationCodeResponseData = VerificationCode;
