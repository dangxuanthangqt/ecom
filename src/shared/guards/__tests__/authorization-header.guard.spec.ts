import { ExecutionContext } from "@nestjs/common";

import {
  AuthorizationType,
  AUTHORIZATION_HEADER_KEY,
  CombinedAuthorizationCondition,
  SECRET_API_KEY,
} from "@/constants/auth.constant";
import { PermissionKey } from "@/constants/permission.constant";

import { AuthorizationHeaderGuard } from "../authorization-header.guard";

import {
  GuardMocks,
  makeAccessTokenPayload,
  makeExecutionContext,
  setupGuards,
} from "./guards-test-harness";

describe("AuthorizationHeaderGuard - canActivate", () => {
  let guard: AuthorizationHeaderGuard;
  let mocks: GuardMocks;

  beforeEach(async () => {
    const setup = await setupGuards();
    guard = setup.authorizationHeaderGuard;
    mocks = setup.mocks;

    // Default mocks for sub-guards
    mocks.tokenService.verifyAccessToken.mockResolvedValue(
      makeAccessTokenPayload(),
    );
    // The harness's AccessTokenGuard reflector declares `product:read:own`;
    // grant it so a valid Bearer token passes the permission check by default.
    mocks.permissionResolverService.forRoles.mockResolvedValue(
      new Set<PermissionKey>(["product:read:own"]),
    );
  });

  it("defaults to BEARER authorization type when no metadata is provided", async () => {
    // Arrange
    mocks.reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    });

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
    expect(mocks.tokenService.verifyAccessToken).toHaveBeenCalled();
  });

  it("allows BEARER authentication when token is valid", async () => {
    // Arrange
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.BEARER],
    });
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    });

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it("allows API_KEY authentication when key is valid", async () => {
    // Arrange
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.API_KEY],
    });
    const context = makeExecutionContext({
      headers: { [SECRET_API_KEY]: "secretApiKey" },
    });

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it("allows NONE authorization without checking any guard", async () => {
    // Arrange
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.NONE],
    });
    const context = makeExecutionContext({ headers: {} });

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
    expect(mocks.tokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it("throws unauthorized when OR condition has all guards failing", async () => {
    // Arrange
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.BEARER, AuthorizationType.API_KEY],
      combinedCondition: CombinedAuthorizationCondition.OR,
    });
    mocks.tokenService.verifyAccessToken.mockRejectedValue(
      new Error("Invalid token"),
    );
    const context = makeExecutionContext({ headers: {} });

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401,
      response: {
        message: "Authorization failed for all conditions.",
      },
    });
  });

  it("returns true when OR condition has first guard succeeding", async () => {
    // Arrange
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.BEARER, AuthorizationType.API_KEY],
      combinedCondition: CombinedAuthorizationCondition.OR,
    });
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    });

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it("tries next guard when OR condition has first guard failing", async () => {
    // Arrange
    mocks.tokenService.verifyAccessToken.mockRejectedValue(
      new Error("Invalid token"),
    );
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.BEARER, AuthorizationType.API_KEY],
      combinedCondition: CombinedAuthorizationCondition.OR,
    });
    const context = makeExecutionContext({
      headers: { [SECRET_API_KEY]: "secretApiKey" },
    });

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it("succeeds when AND condition has all guards passing", async () => {
    // Arrange
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.BEARER, AuthorizationType.API_KEY],
      combinedCondition: CombinedAuthorizationCondition.AND,
    });
    const context = makeExecutionContext({
      headers: {
        authorization: "Bearer valid-token",
        [SECRET_API_KEY]: "secretApiKey",
      },
      route: { path: "/api/users" },
      method: "GET",
    });

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it("throws unauthorized when AND condition has any guard failing", async () => {
    // Arrange
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.BEARER, AuthorizationType.API_KEY],
      combinedCondition: CombinedAuthorizationCondition.AND,
    });
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    });

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it("reads authorization metadata from handler first, then class", async () => {
    // Arrange
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.BEARER],
    });
    const context = {
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => ({
          headers: { authorization: "Bearer valid-token" },
          route: { path: "/api/users" },
          method: "GET",
        })),
        getResponse: jest.fn(() => ({})),
      })),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    // Act
    await guard.canActivate(context);

    // Assert
    expect(mocks.reflector.getAllAndOverride).toHaveBeenCalledWith(
      AUTHORIZATION_HEADER_KEY,
      [context.getHandler(), context.getClass()],
    );
  });

  it("defaults to AND condition when not specified in metadata", async () => {
    // Arrange
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.BEARER],
    });
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    });

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it("skips failed guard and continues with OR condition to find passing guard", async () => {
    // Arrange
    mocks.tokenService.verifyAccessToken.mockRejectedValue(
      new Error("Invalid token"),
    );
    mocks.reflector.getAllAndOverride.mockReturnValue({
      authorizationTypes: [AuthorizationType.BEARER, AuthorizationType.API_KEY],
      combinedCondition: CombinedAuthorizationCondition.OR,
    });
    const context = makeExecutionContext({
      headers: { [SECRET_API_KEY]: "secretApiKey" },
    });

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });
});
