import { SECRET_API_KEY } from "@/constants/auth.constant";

import { ApiKeyGuard } from "../api-key.guard";

import {
  GuardMocks,
  makeExecutionContext,
  setupGuards,
} from "./guards-test-harness";

describe("ApiKeyGuard - canActivate", () => {
  let guard: ApiKeyGuard;
  let mocks: GuardMocks;

  beforeEach(async () => {
    const setup = await setupGuards();
    guard = setup.apiKeyGuard;
    mocks = setup.mocks;
  });

  it("throws UnauthorizedException when x-api-key header is missing", () => {
    // Arrange
    const context = makeExecutionContext({ headers: {} });

    // Act & Assert
    expect(() => guard.canActivate(context)).toThrow();
    expect(() => guard.canActivate(context)).toThrow(
      expect.objectContaining({
        status: 401,
        message: "API key is invalid.",
      }),
    );
  });

  it("throws UnauthorizedException when x-api-key header has invalid value", () => {
    // Arrange
    const context = makeExecutionContext({
      headers: { [SECRET_API_KEY]: "invalid-key" },
    });

    // Act & Assert
    expect(() => guard.canActivate(context)).toThrow(
      expect.objectContaining({
        status: 401,
        message: "API key is invalid.",
      }),
    );
  });

  it("throws UnauthorizedException when x-api-key header is empty string", () => {
    // Arrange
    const context = makeExecutionContext({
      headers: { [SECRET_API_KEY]: "" },
    });

    // Act & Assert
    expect(() => guard.canActivate(context)).toThrow(
      expect.objectContaining({
        status: 401,
        message: "API key is invalid.",
      }),
    );
  });

  it("allows activation when x-api-key header has correct value", () => {
    // Arrange
    const context = makeExecutionContext({
      headers: { [SECRET_API_KEY]: "secretApiKey" },
    });

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it("reads x-api-key from request headers with correct constant key", () => {
    // Arrange
    const request = { headers: { [SECRET_API_KEY]: "secretApiKey" } };
    const context = makeExecutionContext(request);

    // Act
    guard.canActivate(context);

    // Assert
    expect(SECRET_API_KEY).toBe("x-api-key");
  });
});
