import { Test } from "@nestjs/testing";

import { AppConfigService } from "../app-config.service";
import { EmailService } from "../email.service";

interface EmailServiceConfig {
  resendApiKey: string;
}

// Type for the email send parameters
export interface EmailSendParams {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface EmailMockClient {
  emails: {
    send: jest.Mock<Promise<unknown>, [EmailSendParams]>;
  };
}

export const createEmailServiceMocks = () => ({
  appConfigService: {
    appConfig: {
      resendApiKey: "test-resend-api-key",
    } as EmailServiceConfig,
  },
  resend: {
    emails: {
      send: jest.fn<Promise<unknown>, [EmailSendParams]>(),
    },
  } as EmailMockClient,
});

export type EmailServiceMocks = ReturnType<typeof createEmailServiceMocks>;

jest.mock("resend", () => ({
  Resend: jest.fn<EmailMockClient, [string]>().mockImplementation(() => ({
    emails: {
      send: jest.fn<Promise<unknown>, [EmailSendParams]>(),
    },
  })),
}));

export const buildEmailService = async (
  mocks: EmailServiceMocks,
): Promise<EmailService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      EmailService,
      { provide: AppConfigService, useValue: mocks.appConfigService },
    ],
  }).compile();

  return moduleRef.get<EmailService>(EmailService);
};

export const setupEmailService = async () => {
  const mocks = createEmailServiceMocks();
  const service = await buildEmailService(mocks);

  return { mocks, service };
};

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;
