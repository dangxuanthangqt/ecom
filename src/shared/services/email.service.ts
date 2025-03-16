import { Injectable } from "@nestjs/common";
import { Resend } from "resend";

import { AppConfigService } from "./app-config.service";

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  constructor(private readonly configService: AppConfigService) {
    const resendApiKey = this.configService.appConfig.resendApiKey;

    this.resend = new Resend(resendApiKey);
  }

  sendEmail({ email, code }: { email: string; code: string }) {
    return this.resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Verification code",
      html: `<p>${code}</p>`,
    });
  }
}
