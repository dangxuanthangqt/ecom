import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { TokenExpiredError } from "@nestjs/jwt";
import { Request } from "express";

import { TokenService } from "../services/token.service";

import { REQUEST_USER_KEY } from "@/constants/auth.constant";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly logger = new Logger(AccessTokenGuard.name);
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    const authorization = request.headers["authorization"];

    if (authorization && authorization.startsWith("Bearer ")) {
      const accessToken = authorization.split(" ")[1];

      try {
        const decodedAccessToken =
          await this.tokenService.verifyAccessToken(accessToken);

        request[REQUEST_USER_KEY] = decodedAccessToken;

        return true;
      } catch (error) {
        if (error instanceof TokenExpiredError) {
          throw new UnauthorizedException({
            message: "Access token is expired.",
          });
        }

        throw new UnauthorizedException({
          message: "Access token is invalid.",
        });
      }
    }

    throw new UnauthorizedException({
      message: "Access token is required.",
    });
  }
}
