import { TokenExpiredError } from "@nestjs/jwt";

import {
  REQUEST_ROLE_PERMISSIONS_KEY,
  REQUEST_USER_KEY,
} from "@/constants/auth.constant";

import { AccessTokenGuard } from "../access-token.guard";

import {
  GuardMocks,
  makeAccessTokenPayload,
  makeExecutionContext,
  makeRoleWithPermissions,
  MOCK_ROLE_ID,
  setupGuards,
  containing,
} from "./guards-test-harness";

describe("AccessTokenGuard - canActivate", () => {
  let guard: AccessTokenGuard;
  let mocks: GuardMocks;

  beforeEach(async () => {
    const setup = await setupGuards();
    guard = setup.accessTokenGuard;
    mocks = setup.mocks;
  });

  it("throws unauthorized when authorization header is missing", async () => {
    // Arrange
    const context = makeExecutionContext({ headers: {} });

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401,
      response: { message: "Access token is required." },
    });
  });

  it("throws unauthorized when authorization header is empty string", async () => {
    // Arrange
    const context = makeExecutionContext({ headers: { authorization: "" } });

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401,
      response: { message: "Access token is required." },
    });
  });

  it("throws unauthorized when authorization header uses non-Bearer scheme", async () => {
    // Arrange
    const context = makeExecutionContext({
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401,
      response: { message: "Access token is required." },
    });
  });

  it("throws unauthorized when token is invalid", async () => {
    // Arrange
    const context = makeExecutionContext({
      headers: { authorization: "Bearer invalid-token" },
    });
    const error = new Error("Invalid token");
    mocks.tokenService.verifyAccessToken.mockRejectedValue(error);

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401,
      response: { message: "Access token is invalid." },
    });
  });

  it("throws unauthorized when token is expired with TokenExpiredError", async () => {
    // Arrange
    const context = makeExecutionContext({
      headers: { authorization: "Bearer expired-token" },
    });
    const error = new TokenExpiredError("jwt expired", new Date());
    mocks.tokenService.verifyAccessToken.mockRejectedValue(error);

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401,
      response: { message: "Access token is expired." },
    });
  });

  it("throws forbidden when role is not found", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    });
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.prismaService.role.findUniqueOrThrow.mockRejectedValue(
      new Error("Role not found"),
    );

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 403,
      response: {
        message: "You do not have permission to access this resource.",
      },
    });
  });

  it("throws forbidden when role has no matching permission for the route", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const roleWithoutPermission = makeRoleWithPermissions({
      permissions: [],
    });
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/products" },
      method: "POST",
    });
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.prismaService.role.findUniqueOrThrow.mockResolvedValue(
      roleWithoutPermission,
    );

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 403,
      response: {
        message: "You do not have permission to access this resource.",
      },
    });
  });

  it("allows activation when token is valid and role has permission", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const roleWithPermission = makeRoleWithPermissions();
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    });
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.prismaService.role.findUniqueOrThrow.mockResolvedValue(
      roleWithPermission,
    );

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it("attaches decoded token to request under REQUEST_USER_KEY", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const roleWithPermission = makeRoleWithPermissions();
    const request = {
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    };
    const context = makeExecutionContext(request);
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.prismaService.role.findUniqueOrThrow.mockResolvedValue(
      roleWithPermission,
    );

    // Act
    await guard.canActivate(context);

    // Assert
    expect(request[REQUEST_USER_KEY]).toEqual(payload);
  });

  it("attaches role with permissions to request under REQUEST_ROLE_PERMISSIONS_KEY", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const roleWithPermission = makeRoleWithPermissions();
    const request = {
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    };
    const context = makeExecutionContext(request);
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.prismaService.role.findUniqueOrThrow.mockResolvedValue(
      roleWithPermission,
    );

    // Act
    await guard.canActivate(context);

    // Assert
    expect(request[REQUEST_ROLE_PERMISSIONS_KEY]).toEqual(roleWithPermission);
  });

  it("verifies token with the exact token string from Bearer header", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const roleWithPermission = makeRoleWithPermissions();
    const context = makeExecutionContext({
      headers: { authorization: "Bearer my-exact-token-123" },
      route: { path: "/api/users" },
      method: "GET",
    });
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.prismaService.role.findUniqueOrThrow.mockResolvedValue(
      roleWithPermission,
    );

    // Act
    await guard.canActivate(context);

    // Assert
    expect(mocks.tokenService.verifyAccessToken).toHaveBeenCalledWith(
      "my-exact-token-123",
    );
  });

  it("queries role with correct roleId from decoded token", async () => {
    // Arrange
    const payload = makeAccessTokenPayload({ roleId: MOCK_ROLE_ID });
    const roleWithPermission = makeRoleWithPermissions();
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    });
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.prismaService.role.findUniqueOrThrow.mockResolvedValue(
      roleWithPermission,
    );

    // Act
    await guard.canActivate(context);

    // Assert
    expect(mocks.prismaService.role.findUniqueOrThrow).toHaveBeenCalledWith(
      containing({
        where: containing({
          id: MOCK_ROLE_ID,
        }),
      }),
    );
  });

  it("queries role with correct route path and HTTP method", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const roleWithPermission = makeRoleWithPermissions();
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/products/:id" },
      method: "DELETE",
    });
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.prismaService.role.findUniqueOrThrow.mockResolvedValue(
      roleWithPermission,
    );

    // Act
    await guard.canActivate(context);

    // Assert
    expect(mocks.prismaService.role.findUniqueOrThrow).toHaveBeenCalledWith(
      containing({
        select: containing({
          permissions: containing({
            where: containing({
              path: "/api/products/:id",
              method: "DELETE",
            }),
          }),
        }),
      }),
    );
  });

  it("normalizes HTTP method to uppercase when querying permissions", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const roleWithPermission = makeRoleWithPermissions();
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "post",
    });
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.prismaService.role.findUniqueOrThrow.mockResolvedValue(
      roleWithPermission,
    );

    // Act
    await guard.canActivate(context);

    // Assert
    expect(mocks.prismaService.role.findUniqueOrThrow).toHaveBeenCalledWith(
      containing({
        select: containing({
          permissions: containing({
            where: containing({
              method: "POST",
            }),
          }),
        }),
      }),
    );
  });

  it("skips the DB and reuses the cached role on a cache hit", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const cachedRole = makeRoleWithPermissions();
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    });
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.rolePermissionCacheService.get.mockResolvedValue(cachedRole);

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
    expect(mocks.rolePermissionCacheService.get).toHaveBeenCalledWith(
      MOCK_ROLE_ID,
      "GET",
      "/api/users",
    );
    expect(mocks.prismaService.role.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("populates the cache with the DB result on a cache miss", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const roleWithPermission = makeRoleWithPermissions();
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/users" },
      method: "GET",
    });
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.rolePermissionCacheService.get.mockResolvedValue(null);
    mocks.prismaService.role.findUniqueOrThrow.mockResolvedValue(
      roleWithPermission,
    );

    // Act
    await guard.canActivate(context);

    // Assert
    expect(mocks.rolePermissionCacheService.set).toHaveBeenCalledWith(
      MOCK_ROLE_ID,
      "GET",
      "/api/users",
      roleWithPermission,
    );
  });

  it("throws forbidden when the cached role has no matching permission", async () => {
    // Arrange
    const payload = makeAccessTokenPayload();
    const cachedRoleWithoutPermission = makeRoleWithPermissions({
      permissions: [],
    });
    const context = makeExecutionContext({
      headers: { authorization: "Bearer valid-token" },
      route: { path: "/api/products" },
      method: "POST",
    });
    mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
    mocks.rolePermissionCacheService.get.mockResolvedValue(
      cachedRoleWithoutPermission,
    );

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 403,
      response: {
        message: "You do not have permission to access this resource.",
      },
    });
    expect(mocks.prismaService.role.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
