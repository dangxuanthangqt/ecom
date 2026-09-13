import { VerificationCodeType } from "@prisma/client";
import request from "supertest";

import { requestOtp } from "../support/auth.helper";
import {
  closeTestApp,
  createTestApp,
  TestApp,
} from "../support/create-test-app";
import { FixtureEmail, RoleId } from "../support/fixtures";
import { prismaTestClient } from "../support/prisma-test-client";

interface ValidationErrorDetail {
  field: string;
  message: string;
}

interface ErrorResponseBody {
  statusCode: number;
  message: string | ValidationErrorDetail[];
}

/**
 * OTP -> register -> login, over real HTTP end to end. `POST /auth/otp`
 * writes straight to Postgres and sends no email (see phase-01 Key Insight
 * 8 / phase-02 Key Insight); the code is read back with `requestOtp()`.
 */
describe("auth registration flow", () => {
  let app: TestApp;
  let counter = 0;

  const uniqueEmail = () =>
    `e2e-register-${Date.now()}-${counter++}@ecom.local`;

  const registerBody = (overrides: Record<string, unknown> = {}) => ({
    email: uniqueEmail(),
    password: "SecurePass123",
    confirmPassword: "SecurePass123",
    phoneNumber: "0912345678",
    name: "E2E Registrant",
    ...overrides,
  });

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("registers with a real OTP code, then logs in", async () => {
    const email = uniqueEmail();

    const code = await requestOtp(app, email, VerificationCodeType.REGISTER);

    const registerResponse = await request(app.getHttpServer())
      .post("/auth/register")
      .send(registerBody({ email, code }))
      .expect(200);

    const registerBodyResponse = registerResponse.body as {
      id: string;
      email: string;
      name: string;
    };
    expect(registerBodyResponse).toMatchObject({
      email,
      name: "E2E Registrant",
    });
    expect(registerBodyResponse.id).toEqual(expect.any(String));

    const createdUser = await prismaTestClient.user.findUniqueOrThrow({
      where: { id: registerBodyResponse.id },
    });
    expect(createdUser.roleId).toBe(RoleId.CLIENT);

    await request(app.getHttpServer())
      .post("/auth/login")
      .set("User-Agent", "e2e-test-agent")
      .send({ email, password: "SecurePass123" })
      .expect(200);
  });

  it("rejects registration with the wrong verification code", async () => {
    const email = uniqueEmail();

    await requestOtp(app, email, VerificationCodeType.REGISTER);

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send(registerBody({ email, code: "000000" }))
      .expect(422);

    expect((response.body as ErrorResponseBody).message).toBe(
      "Verification code is not valid.",
    );
  });

  it("rejects a REGISTER otp request for an email that already exists", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/otp")
      .send({ email: FixtureEmail.CLIENT, type: VerificationCodeType.REGISTER })
      .expect(422);

    expect((response.body as ErrorResponseBody).message).toBe(
      "Email is already exist.",
    );
  });

  it("rejects registration with a missing required field", async () => {
    const email = uniqueEmail();
    const body = registerBody({ email });
    // Omit `code`, the OTP field required by RegisterRequestDto.
    delete (body as { code?: string }).code;

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send(body)
      .expect(400);

    const errorBody = response.body as ErrorResponseBody;
    expect(Array.isArray(errorBody.message)).toBe(true);
    expect(errorBody.message).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "code" })]),
    );
  });
});
