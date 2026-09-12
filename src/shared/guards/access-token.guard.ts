import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from "@nestjs/common";
import { TokenExpiredError } from "@nestjs/jwt";
import { HTTPMethod, Prisma } from "@prisma/client";
import { Request } from "express";

import {
  REQUEST_ROLE_PERMISSIONS_KEY,
  REQUEST_USER_KEY,
} from "@/constants/auth.constant";
import { roleWithPermissionsSelect } from "@/selectors/role.selector";
import { AccessTokenPayload } from "@/types/jwt-payload.type";

import { PrismaService } from "../services/prisma.service";
import { RolePermissionCacheService } from "../services/role-permission-cache.service";
import { TokenService } from "../services/token.service";
import throwHttpException from "../utils/throw-http-exception.util";

// The one place this select shape is built. Both the real query (below) and
// the cached-value type (derived from this same function) come from here, so
// the two can never drift apart — only the runtime path/method values differ.
const buildRoleRoutePermissionSelect = (path: string, method: HTTPMethod) =>
  Prisma.validator<Prisma.RoleSelect>()({
    ...roleWithPermissionsSelect,
    permissions: {
      where: { deletedAt: null, path, method },
    },
  });

type RoleWithRoutePermissions = Prisma.RoleGetPayload<{
  select: ReturnType<typeof buildRoleRoutePermissionSelect>;
}>;

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly logger = new Logger(AccessTokenGuard.name);
  constructor(
    private readonly tokenService: TokenService,
    private readonly prismaService: PrismaService,
    private readonly rolePermissionCacheService: RolePermissionCacheService,
  ) {}

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];

    return type === "Bearer" ? token : undefined;
  }

  private async verifyToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.tokenService.verifyAccessToken(token);
    } catch (error) {
      this.logger.error(error);

      if (error instanceof TokenExpiredError) {
        throwHttpException({
          type: "unauthorized",
          message: "Access token is expired.",
        });
      }

      throwHttpException({
        type: "unauthorized",
        message: "Access token is invalid.",
      });
    }
  }

  /**
   * Reads the role+permission snapshot for this route from Redis first
   * (`RolePermissionCacheService`), falling back to Postgres on a miss and
   * populating the cache for next time. A short TTL bounds staleness after a
   * permission change; callers that mutate roles/permissions also invalidate
   * the cache directly (see RoleService / PermissionService).
   *
   * Accepted trade-off: a request that starts its DB read just before a
   * concurrent role/permission mutation invalidates the cache can still
   * write its (now stale) result back afterward — the classic cache-aside
   * "recovery race". Bounded by the 300s TTL and considered acceptable given
   * every mutation path already invalidates proactively; not fixed here.
   */
  private async fetchRolePermission({
    roleId,
    method,
    path,
  }: {
    roleId: AccessTokenPayload["roleId"];
    method: HTTPMethod;
    path: string;
  }) {
    const cachedRole =
      await this.rolePermissionCacheService.get<RoleWithRoutePermissions>(
        roleId,
        method,
        path,
      );

    if (cachedRole) {
      return cachedRole;
    }

    const role = await this.prismaService.role.findUniqueOrThrow({
      where: {
        deletedAt: null,
        id: roleId,
        isActive: true,
      },
      select: buildRoleRoutePermissionSelect(path, method),
    });

    await this.rolePermissionCacheService.set(roleId, method, path, role);

    return role;
  }

  private async verifyRolePermission(
    request: Request,
    decodedAccessToken: AccessTokenPayload,
  ): Promise<void> {
    try {
      const path = (request.route as { path: string }).path; // check permission of the route

      const method = request.method.toUpperCase() as HTTPMethod;

      const role = await this.fetchRolePermission({
        roleId: decodedAccessToken.roleId,
        method,
        path,
      });

      request[REQUEST_ROLE_PERMISSIONS_KEY] = role;

      if (role.permissions.length === 0) {
        throwHttpException({
          type: "forbidden",
          message: "You do not have permission to access this resource.",
        });
      }
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "forbidden",
        message: "You do not have permission to access this resource.",
      });
    }
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    const accessToken = this.extractTokenFromHeader(request);

    if (!accessToken) {
      this.logger.error("Access token is missing.");

      throwHttpException({
        type: "unauthorized",
        message: "Access token is required.",
      });
    }

    const decodedAccessToken = await this.verifyToken(accessToken);

    request[REQUEST_USER_KEY] = decodedAccessToken;

    await this.verifyRolePermission(request, decodedAccessToken);

    return true;
  }
}
