import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from "@nestjs/common";
import { TokenExpiredError } from "@nestjs/jwt";
import { HTTPMethod } from "@prisma/client";
import { Request } from "express";

import { PrismaService } from "../services/prisma.service";
import { TokenService } from "../services/token.service";
import throwHttpException from "../utils/throw-http-exception.util";

import { REQUEST_USER_KEY } from "@/constants/auth.constant";
import { AccessTokenPayload } from "@/types/jwt-payload.type";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly logger = new Logger(AccessTokenGuard.name);
  constructor(
    private readonly tokenService: TokenService,
    private readonly prismaService: PrismaService,
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

  private async verifyRolePermission(
    request: Request,
    decodedAccessToken: AccessTokenPayload,
  ): Promise<void> {
    try {
      const path = (request.route as { path: string }).path;

      const method = request.method.toUpperCase() as HTTPMethod;

      const role = await this.prismaService.role.findUniqueOrThrow({
        where: {
          deletedAt: null,
          id: decodedAccessToken.roleId,
        },
        include: {
          permissions: {
            where: {
              deletedAt: null,
              path,
              method,
            },
          },
        },
      });

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
