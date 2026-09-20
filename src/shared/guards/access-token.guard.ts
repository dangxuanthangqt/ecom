import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TokenExpiredError } from "@nestjs/jwt";
import { Request } from "express";

import {
  REQUEST_GRANTED_PERMISSIONS_KEY,
  REQUEST_USER_KEY,
} from "@/constants/auth.constant";
import { PermissionKey } from "@/constants/permission.constant";
import { PERMISSION_KEY } from "@/shared/param-decorators/require-permission.decorator";
import { AccessTokenPayload } from "@/types/jwt-payload.type";

import { PermissionResolverService } from "../services/permission-resolver.service";
import { TokenService } from "../services/token.service";
import { satisfies } from "../utils/permission.util";
import throwHttpException from "../utils/throw-http-exception.util";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly logger = new Logger(AccessTokenGuard.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly permissionResolverService: PermissionResolverService,
    private readonly reflector: Reflector,
  ) {}

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];

    return type === "Bearer" ? token : undefined;
  }

  private async verifyToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.tokenService.verifyAccessToken(token);
    } catch (error) {
      // A bad or stale token is ordinary client behaviour, not an incident.
      this.logger.debug(
        `Access token rejected: ${error instanceof Error ? error.message : String(error)}`,
      );

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
   * Compares what the handler declared with `@RequirePermission` against the
   * caller's resolved grant set.
   *
   * Only the authorization outcome is mapped to 403. A failure to *resolve* the
   * set (database or cache infrastructure) is left to propagate as 500: the
   * previous guard wrapped everything in one catch and answered "forbidden",
   * which mis-reported outages as policy and made them invisible.
   */
  private async verifyPermission(
    context: ExecutionContext,
    request: Request,
    payload: AccessTokenPayload,
  ): Promise<void> {
    const required = this.reflector.getAllAndOverride<
      PermissionKey | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!required) {
      // `PermissionCoverageService` refuses to boot the app in this state, so
      // reaching here means the check was bypassed — a wiring defect, not a
      // client error, and the safe answer is to deny loudly.
      this.logger.error(
        `${context.getClass().name}.${context.getHandler().name} reached the guard without @RequirePermission`,
      );

      throwHttpException({
        type: "internal",
        message: "Route has no permission declaration.",
      });
    }

    const granted = await this.permissionResolverService.forRoles([
      payload.roleId,
    ]);

    request[REQUEST_GRANTED_PERMISSIONS_KEY] = granted;

    if (!satisfies(granted, required)) {
      throwHttpException({
        type: "forbidden",
        message: "You do not have permission to access this resource.",
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const accessToken = this.extractTokenFromHeader(request);

    if (!accessToken) {
      throwHttpException({
        type: "unauthorized",
        message: "Access token is required.",
      });
    }

    const payload = await this.verifyToken(accessToken);

    request[REQUEST_USER_KEY] = payload;

    await this.verifyPermission(context, request, payload);

    return true;
  }
}
