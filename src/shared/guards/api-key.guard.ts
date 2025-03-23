import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";

import { AppConfigService } from "../services/app-config.service";

import { SECRET_API_KEY } from "@/constants/auth.constant";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly appConfigService: AppConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    const headerApiKey = request.headers[SECRET_API_KEY];
    // const secretApiKey = this.appConfigService.get("SECRET_API_KEY");

    if (headerApiKey === "secretApiKey") {
      return true;
    }

    throw new UnauthorizedException("API key is invalid.");
  }
}
