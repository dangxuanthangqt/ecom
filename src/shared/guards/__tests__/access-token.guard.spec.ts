import { TokenExpiredError } from "@nestjs/jwt";

import {
  REQUEST_GRANTED_PERMISSIONS_KEY,
  REQUEST_USER_KEY,
} from "@/constants/auth.constant";
import { PermissionKey } from "@/constants/permission.constant";

import { AccessTokenGuard } from "../access-token.guard";

import {
  GuardMocks,
  MOCK_ROLE_ID,
  makeAccessTokenPayload,
  makeExecutionContext,
  setupGuards,
} from "./guards-test-harness";

const rejectsWith = async (
  promise: Promise<unknown>,
  status: number,
  message: string,
) => expect(promise).rejects.toMatchObject({ status, response: { message } });

describe("AccessTokenGuard - canActivate", () => {
  let guard: AccessTokenGuard;
  let mocks: GuardMocks;

  const bearer = (token = "valid.jwt.token") => ({
    headers: { authorization: `Bearer ${token}` },
  });

  const grant = (...keys: PermissionKey[]) =>
    mocks.permissionResolverService.forRoles.mockResolvedValue(
      new Set<PermissionKey>(keys),
    );

  const require = (key: PermissionKey | undefined) =>
    mocks.accessTokenReflector.getAllAndOverride.mockReturnValue(key);

  beforeEach(async () => {
    const setup = await setupGuards();
    guard = setup.accessTokenGuard;
    mocks = setup.mocks;
    mocks.tokenService.verifyAccessToken.mockResolvedValue(
      makeAccessTokenPayload(),
    );
    require("product:read:own");
  });

  describe("authentication", () => {
    it("throws unauthorized when the authorization header is missing", async () => {
      await rejectsWith(
        guard.canActivate(makeExecutionContext({ headers: {} })),
        401,
        "Access token is required.",
      );
    });

    it("throws unauthorized for a non-Bearer scheme", async () => {
      await rejectsWith(
        guard.canActivate(
          makeExecutionContext({ headers: { authorization: "Basic abc" } }),
        ),
        401,
        "Access token is required.",
      );
    });

    it("throws unauthorized when the token is invalid", async () => {
      mocks.tokenService.verifyAccessToken.mockRejectedValue(
        new Error("invalid signature"),
      );

      await rejectsWith(
        guard.canActivate(makeExecutionContext(bearer())),
        401,
        "Access token is invalid.",
      );
    });

    it("throws unauthorized with a distinct message when the token is expired", async () => {
      mocks.tokenService.verifyAccessToken.mockRejectedValue(
        new TokenExpiredError("jwt expired", new Date()),
      );

      await rejectsWith(
        guard.canActivate(makeExecutionContext(bearer())),
        401,
        "Access token is expired.",
      );
    });

    it("verifies exactly the token string after the Bearer prefix", async () => {
      grant("product:read:own");

      await guard.canActivate(makeExecutionContext(bearer("the.exact.token")));

      expect(mocks.tokenService.verifyAccessToken).toHaveBeenCalledWith(
        "the.exact.token",
      );
    });
  });

  describe("authorization", () => {
    it("resolves the grant set for the role carried in the token", async () => {
      grant("product:read:own");

      await guard.canActivate(makeExecutionContext(bearer()));

      expect(mocks.permissionResolverService.forRoles).toHaveBeenCalledWith([
        MOCK_ROLE_ID,
      ]);
    });

    it("admits a caller holding exactly the required key", async () => {
      grant("product:read:own");

      await expect(
        guard.canActivate(makeExecutionContext(bearer())),
      ).resolves.toBe(true);
    });

    it("admits a caller holding the `any` form of an `own` requirement", async () => {
      grant("product:read:any");

      await expect(
        guard.canActivate(makeExecutionContext(bearer())),
      ).resolves.toBe(true);
    });

    it("rejects a caller holding only `own` when the route requires `any`", async () => {
      require("product:read:any");
      grant("product:read:own");

      await rejectsWith(
        guard.canActivate(makeExecutionContext(bearer())),
        403,
        "You do not have permission to access this resource.",
      );
    });

    it("rejects a caller whose grant set is empty (unknown or inactive role)", async () => {
      grant();

      await rejectsWith(
        guard.canActivate(makeExecutionContext(bearer())),
        403,
        "You do not have permission to access this resource.",
      );
    });

    it("rejects a caller holding a different resource's key", async () => {
      grant("brand:read:any", "cart:update:own");

      await rejectsWith(
        guard.canActivate(makeExecutionContext(bearer())),
        403,
        "You do not have permission to access this resource.",
      );
    });

    it("answers 500, not 403, when the route carries no @RequirePermission", async () => {
      // The boot check should make this unreachable; if it is reached, the
      // wiring is broken and "forbidden" would misreport a defect as policy.
      require(undefined);
      grant("product:read:own");

      await rejectsWith(
        guard.canActivate(makeExecutionContext(bearer())),
        500,
        "Route has no permission declaration.",
      );
    });

    it("lets an infrastructure failure propagate instead of mapping it to 403", async () => {
      const outage = new Error("Connection terminated unexpectedly");
      mocks.permissionResolverService.forRoles.mockRejectedValue(outage);

      await expect(
        guard.canActivate(makeExecutionContext(bearer())),
      ).rejects.toBe(outage);
    });
  });

  describe("request enrichment", () => {
    it("attaches the decoded token under REQUEST_USER_KEY", async () => {
      const payload = makeAccessTokenPayload();
      mocks.tokenService.verifyAccessToken.mockResolvedValue(payload);
      grant("product:read:own");
      const request = bearer() as Record<string, unknown>;

      await guard.canActivate(makeExecutionContext(request));

      expect(request[REQUEST_USER_KEY]).toEqual(payload);
    });

    it("attaches the resolved grant set for the service layer to read scope from", async () => {
      const granted = new Set<PermissionKey>(["product:read:any"]);
      mocks.permissionResolverService.forRoles.mockResolvedValue(granted);
      const request = bearer() as Record<string, unknown>;

      await guard.canActivate(makeExecutionContext(request));

      expect(request[REQUEST_GRANTED_PERMISSIONS_KEY]).toBe(granted);
    });
  });
});
