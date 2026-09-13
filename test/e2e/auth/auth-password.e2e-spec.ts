import { VerificationCodeType } from "@prisma/client";
import request from "supertest";

import { createTestUser, requestOtp } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";

interface MessageResponseBody {
  message: string;
}

/**
 * Forgot-password over real HTTP: OTP -> reset -> old password rejected,
 * new password accepted. Every actor here is a throwaway `createTestUser()`
 * account, never a shared fixture, so a reset never leaks into another spec.
 */
describe("auth forgot-password flow", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("resets the password with a real OTP, retiring the old one", async () => {
    const user = await createTestUser();
    const newPassword = "BrandNewPass123";

    const code = await requestOtp(
      app,
      user.email,
      VerificationCodeType.FORGOT_PASSWORD,
    );

    const resetResponse = await request(app.getHttpServer())
      .post("/auth/forgot-password")
      .send({
        email: user.email,
        password: newPassword,
        confirmPassword: newPassword,
        code,
      })
      .expect(200);

    expect((resetResponse.body as MessageResponseBody).message).toBe(
      "Password has been updated.",
    );

    await request(app.getHttpServer())
      .post("/auth/login")
      .set("User-Agent", "e2e-test-agent")
      .send({ email: user.email, password: user.password })
      .expect(400);

    await request(app.getHttpServer())
      .post("/auth/login")
      .set("User-Agent", "e2e-test-agent")
      .send({ email: user.email, password: newPassword })
      .expect(200);
  });

  it("rejects a FORGOT_PASSWORD otp request for an unknown email", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/otp")
      .send({
        email: "unknown-e2e-user@ecom.local",
        type: VerificationCodeType.FORGOT_PASSWORD,
      })
      .expect(422);

    expect((response.body as MessageResponseBody).message).toBe(
      "Email is not exist.",
    );
  });

  it("rejects forgot-password with the wrong verification code", async () => {
    const user = await createTestUser();

    const response = await request(app.getHttpServer())
      .post("/auth/forgot-password")
      .send({
        email: user.email,
        password: "AnotherNewPass123",
        confirmPassword: "AnotherNewPass123",
        code: "000000",
      })
      .expect(422);

    expect((response.body as MessageResponseBody).message).toBe(
      "Verification code is not valid.",
    );
  });
});
