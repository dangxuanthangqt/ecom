import { Injectable } from "@nestjs/common";
import * as OTPAuth from "otpauth";

@Injectable()
export class TwoFactorAuthenticationService {
  private createTOTP(email: string, secret?: string) {
    return new OTPAuth.TOTP({
      issuer: "E-commerce",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret || new OTPAuth.Secret().base32,
    });
  }

  generateTOTPSecret(email: string, secret?: string) {
    const totp = this.createTOTP(email, secret);

    return {
      secret: totp.secret.base32,
      uri: totp.toString(),
    };
  }

  verifyTOTPCode({
    email,
    totpCode,
    secret,
  }: {
    totpCode: string;
    email: string;
    secret: string;
  }) {
    const totp = this.createTOTP(email, secret);

    const delta = totp.validate({ token: totpCode, window: 1 });

    return delta !== null;
  }
}
