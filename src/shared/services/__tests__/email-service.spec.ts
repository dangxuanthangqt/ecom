import { EmailService } from "../email.service";

import {
  EmailMockClient,
  setupEmailService,
  containing,
} from "./email-service-test-harness";

// Type for accessing mocked resend property
interface EmailServiceWithMockedResend {
  resend: EmailMockClient;
  sendEmail(params: { email: string; code: string }): Promise<unknown>;
}

describe("EmailService", () => {
  let service: EmailService;
  let mocks: ReturnType<typeof setupEmailService> extends Promise<infer T>
    ? T
    : never;

  beforeEach(async () => {
    jest.clearAllMocks();
    mocks = await setupEmailService();
    service = mocks.service;
  });

  // Helper to access mocked resend safely
  const getServiceWithMocks = (): EmailServiceWithMockedResend => {
    return service as unknown as EmailServiceWithMockedResend;
  };

  describe("sendEmail", () => {
    it("sends email with verification code successfully", async () => {
      // Arrange
      const email = "user@example.com";
      const code = "123456";
      const mockResponse = { success: true, id: "email-id-123" };
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockResolvedValue(mockResponse);

      // Act
      const result = await service.sendEmail({ email, code });

      // Assert
      const sendCall = mocked.resend.emails.send.mock.calls[0]?.[0];
      expect(sendCall).toBeDefined();
      if (sendCall) {
        expect(sendCall.from).toBe("onboarding@resend.dev");
        expect(sendCall.to).toBe(email);
        expect(sendCall.subject).toBe("Verification code");
        expect(sendCall.html).toContain(code);
      }
      expect(result).toEqual(mockResponse);
    });

    it("includes verification code in HTML body", async () => {
      // Arrange
      const email = "user@example.com";
      const code = "654321";
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockResolvedValue({});

      // Act
      await service.sendEmail({ email, code });

      // Assert
      const call = mocked.resend.emails.send.mock.calls[0]?.[0];
      expect(call.html).toBe(`<p>${code}</p>`);
    });

    it("sends to correct recipient email", async () => {
      // Arrange
      const email = "recipient@example.com";
      const code = "123456";
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockResolvedValue({});

      // Act
      await service.sendEmail({ email, code });

      // Assert
      const call = mocked.resend.emails.send.mock.calls[0]?.[0];
      expect(call.to).toBe(email);
    });

    it("uses correct sender email", async () => {
      // Arrange
      const email = "user@example.com";
      const code = "123456";
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockResolvedValue({});

      // Act
      await service.sendEmail({ email, code });

      // Assert
      const call = mocked.resend.emails.send.mock.calls[0]?.[0];
      expect(call.from).toBe("onboarding@resend.dev");
    });

    it("uses correct subject line", async () => {
      // Arrange
      const email = "user@example.com";
      const code = "123456";
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockResolvedValue({});

      // Act
      await service.sendEmail({ email, code });

      // Assert
      const call = mocked.resend.emails.send.mock.calls[0]?.[0];
      expect(call.subject).toBe("Verification code");
    });

    it("handles numeric verification codes", async () => {
      // Arrange
      const email = "user@example.com";
      const code = "000000";
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockResolvedValue({});

      // Act
      await service.sendEmail({ email, code });

      // Assert
      const call = mocked.resend.emails.send.mock.calls[0]?.[0];
      expect(call.html).toContain("000000");
    });

    it("handles alphanumeric verification codes", async () => {
      // Arrange
      const email = "user@example.com";
      const code = "ABC123XYZ";
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockResolvedValue({});

      // Act
      await service.sendEmail({ email, code });

      // Assert
      const call = mocked.resend.emails.send.mock.calls[0]?.[0];
      expect(call.html).toContain("ABC123XYZ");
    });

    it("throws error when Resend API fails", async () => {
      // Arrange
      const email = "user@example.com";
      const code = "123456";
      const error = new Error("Resend API error");
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendEmail({ email, code })).rejects.toThrow(error);
    });

    it("throws error for invalid email", async () => {
      // Arrange
      const email = "invalid-email";
      const code = "123456";
      const error = new Error("Invalid email format");
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendEmail({ email, code })).rejects.toThrow(error);
    });

    it("handles network timeout", async () => {
      // Arrange
      const email = "user@example.com";
      const code = "123456";
      const error = new Error("Network timeout");
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendEmail({ email, code })).rejects.toThrow(error);
    });

    it("returns response from Resend API", async () => {
      // Arrange
      const email = "user@example.com";
      const code = "123456";
      const mockResponse = {
        created_at: "2024-01-01T00:00:00Z",
      };
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockResolvedValue(mockResponse);

      // Act
      const result = await service.sendEmail({ email, code });

      // Assert
      expect(result).toEqual(mockResponse);
      expect(result).toBeDefined();
    });

    it("sends multiple emails in sequence", async () => {
      // Arrange
      const emails = [
        { email: "user1@example.com", code: "111111" },
        { email: "user2@example.com", code: "222222" },
        { email: "user3@example.com", code: "333333" },
      ];
      const mocked = getServiceWithMocks();
      mocked.resend.emails.send.mockResolvedValue({});

      // Act
      for (const { email, code } of emails) {
        await service.sendEmail({ email, code });
      }

      // Assert
      expect(mocked.resend.emails.send).toHaveBeenCalledTimes(3);
      expect(mocked.resend.emails.send).toHaveBeenNthCalledWith(
        1,
        containing({ to: "user1@example.com", html: "<p>111111</p>" }),
      );
      expect(mocked.resend.emails.send).toHaveBeenNthCalledWith(
        2,
        containing({ to: "user2@example.com", html: "<p>222222</p>" }),
      );
      expect(mocked.resend.emails.send).toHaveBeenNthCalledWith(
        3,
        containing({ to: "user3@example.com", html: "<p>333333</p>" }),
      );
    });
  });
});
