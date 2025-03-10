import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { v4 as uuidv4 } from "uuid";

import { AppConfigService } from "./app-config.service";

import {
  AccessTokenPayload,
  AccessTokenPayloadCreate,
  RefreshTokenPayload,
  RefreshTokenPayloadCreate,
} from "@/types/jwt-payload.type";

@Injectable()
export class TokenService {
  private readonly appConfig: AppConfigService["appConfig"];

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.appConfig = this.appConfigService.appConfig;
  }

  signAccessToken(payload: AccessTokenPayloadCreate) {
    const accessTokenConfig = this.appConfig.accessTokenConfig;

    return this.jwtService.sign(
      { ...payload, uuid: uuidv4() },
      {
        secret: accessTokenConfig.secretKey,
        expiresIn: accessTokenConfig.expiresIn,
        algorithm: "HS256",
      },
    );
  }

  signRefreshToken(payload: RefreshTokenPayloadCreate) {
    const refreshTokenConfig = this.appConfig.refreshTokenConfig;

    return this.jwtService.sign(
      { ...payload, uuid: uuidv4() },
      {
        secret: refreshTokenConfig.secretKey,
        expiresIn: refreshTokenConfig.expiresIn,
        algorithm: "HS256",
      },
    );
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const accessTokenConfig = this.appConfig.accessTokenConfig;

    return this.jwtService.verifyAsync(token, {
      secret: accessTokenConfig.secretKey,
    });
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const refreshTokenConfig = this.appConfig.refreshTokenConfig;

    return this.jwtService.verifyAsync(token, {
      secret: refreshTokenConfig.secretKey,
    });
  }
}
