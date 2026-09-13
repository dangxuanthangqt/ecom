import * as OTPAuth from "otpauth";
import request from "supertest";

import { authed, createTestUser, loginAs } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";

interface MessageResponseBody {
  message: string;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}

interface ValidationErrorResponseBody {
  statusCode: number;
  message: ValidationErrorDetail[];
}

interface AccessTokenResponseBody {
  accessToken: string;
}

/**
 * 2FA enable -> login-with-totp -> disable, over real HTTP. Every actor is a
 * throwaway `createTestUser()` account (never the seeded `client@ecom.local`
 * fixture, so later phases never see totpSecret set on a shared row — see
 * phase-02's risk assessment). The TOTP code is generated with the same
 * `otpauth` library/params `TwoFactorAuthenticationService` uses internally
 * (issuer "E-commerce", SHA1, 6 digits, 30s period) — never by calling that
 * service class directly.
 */
describe("auth two-factor flow", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  function generateTotpCode(email: string, secret: string): string {
    const totp = new OTPAuth.TOTP({
      issuer: "E-commerce",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    return totp.generate();
  }

  it("enables 2FA, requires a TOTP code at login, then disables it", async () => {
    const user = await createTestUser();
    const { accessToken } = await loginAs(app, user.email, user.password);
    const client = authed(app, accessToken);

    const enableResponse = await client
      .post("/auth/2fa/enable")
      .send({})
      .expect(200);
    const { secret } = enableResponse.body as { secret: string; uri: string };
    expect(secret).toEqual(expect.any(String));

    const loginNoCodeResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .set("User-Agent", "e2e-test-agent")
      .send({ email: user.email, password: user.password })
      .expect(400);
    expect(
      (loginNoCodeResponse.body as ValidationErrorResponseBody).message,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "TOTP or verification code is required.",
        }),
      ]),
    );

    const loginBadCodeResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .set("User-Agent", "e2e-test-agent")
      .send({ email: user.email, password: user.password, totpCode: "000000" })
      .expect(422);
    expect((loginBadCodeResponse.body as MessageResponseBody).message).toBe(
      "TOTP code is not valid.",
    );

    const loginOkResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .set("User-Agent", "e2e-test-agent")
      .send({
        email: user.email,
        password: user.password,
        totpCode: generateTotpCode(user.email, secret),
      })
      .expect(200);
    expect(
      (loginOkResponse.body as AccessTokenResponseBody).accessToken,
    ).toEqual(expect.any(String));

    const disableResponse = await client
      .post("/auth/2fa/disable")
      .send({ totpCode: generateTotpCode(user.email, secret) })
      .expect(200);
    expect((disableResponse.body as MessageResponseBody).message).toBe(
      "2FA has been disabled.",
    );

    // 2FA is off: login no longer needs a code at all.
    await request(app.getHttpServer())
      .post("/auth/login")
      .set("User-Agent", "e2e-test-agent")
      .send({ email: user.email, password: user.password })
      .expect(200);
  });

  it("rejects enabling 2FA twice", async () => {
    const user = await createTestUser();
    const { accessToken } = await loginAs(app, user.email, user.password);
    const client = authed(app, accessToken);

    await client.post("/auth/2fa/enable").send({}).expect(200);

    const response = await client.post("/auth/2fa/enable").send({}).expect(422);
    expect((response.body as MessageResponseBody).message).toBe(
      "2FA is already enabled.",
    );
  });

  it("rejects 2fa/enable with no Authorization header", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/2fa/enable")
      .send({})
      .expect(401);

    expect((response.body as MessageResponseBody).message).toBe(
      "Access token is required.",
    );
  });

  it("rejects 2fa/disable with a malformed totpCode", async () => {
    const user = await createTestUser();
    const { accessToken } = await loginAs(app, user.email, user.password);
    const client = authed(app, accessToken);

    await client.post("/auth/2fa/enable").send({}).expect(200);

    // Class-validator's `@IsOptional()` short-circuits `code`/`totpCode`
    // entirely when the property is `undefined`, so an empty body passes
    // DTO validation (see phase-02 gap notes). A malformed-but-present
    // `totpCode` still hits the `Length(6, 6)` constraint, which is the
    // validation-error case this route can actually produce.
    const response = await client
      .post("/auth/2fa/disable")
      .send({ totpCode: "123" })
      .expect(400);

    expect((response.body as ValidationErrorResponseBody).message).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "OptCode must be exactly 6 characters.",
        }),
      ]),
    );
  });
});
