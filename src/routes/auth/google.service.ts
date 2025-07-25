import { Injectable, Logger } from "@nestjs/common";
import { Device } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { z } from "zod";

import { DeviceRepository } from "@/repositories/device/device.repository";
import { SharedRoleRepository } from "@/repositories/role/shared-role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { AppConfigService } from "@/shared/services/app-config.service";
import { HashingService } from "@/shared/services/hashing.service";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

import { AuthService } from "./auth.service";

const DEFAULT_PASSWORD = "changeme";

@Injectable()
export class GoogleService {
  private logger = new Logger(GoogleService.name);

  private oauth2Client: OAuth2Client;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly hashingService: HashingService,
    private readonly sharedRoleRepository: SharedRoleRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly authService: AuthService,
  ) {
    const { googleClientId, googleClientSecret, googleRedirectUri } =
      this.appConfigService.appConfig;

    this.oauth2Client = new google.auth.OAuth2({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      redirectUri: googleRedirectUri,
    });
  }

  /**
   * Generates the authorization URL for Google OAuth2.
   *
   * @param userAgent - The user agent of the device making the request.
   * @param ip - The IP address of the device making the request.
   * @returns The authorization URL to redirect the user to for Google login.
   */
  getAuthorizationUrl({ userAgent, ip }: Pick<Device, "userAgent" | "ip">) {
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const stateString = Buffer.from(JSON.stringify({ userAgent, ip })).toString(
      "base64",
    );

    const url = this.oauth2Client.generateAuthUrl({
      access_type: "offline", // Requests offline access so the app can obtain a refresh token
      scope: scopes, // Specifies the list of scopes for which the application is requesting authorization
      include_granted_scopes: true, // Indicates that previously granted scopes should be included in the consent screen
      state: stateString, // A string value that's passed to and from the authorization server, used to maintain state between the request and callback
    });

    return url;
  }

  /**
   * Handles the callback from Google after the user has authorized the application.
   *
   * @param code - The authorization code received from Google.
   * @param state - The state parameter that was sent in the authorization request.
   * @returns An object containing the authentication tokens for the user.
   */
  async googleCallback(code: string, state: string) {
    const StateSchema = z.object({
      userAgent: z.string().min(1),
      ip: z.string().ip(),
    });

    try {
      const stateData = JSON.parse(
        Buffer.from(state, "base64").toString(),
      ) as object;

      const validatedState = StateSchema.parse(stateData);

      // Get tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      this.oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({
        version: "v2",
        auth: this.oauth2Client,
      });

      const { data } = await oauth2.userinfo.get();

      if (!data.email) {
        throw new Error("Invalid email.");
      }

      let user = await this.sharedUserRepository.findFirst({
        where: {
          email: data.email,
          deletedAt: null,
        },
        include: {
          role: true,
        },
      });

      if (!user) {
        // Create new user
        const clientRoleId = await this.sharedRoleRepository.getClientRoleId();

        user = await this.sharedUserRepository.createUser({
          data: {
            email: data.email,
            name: data.name ?? "",
            roleId: clientRoleId,
            password: this.hashingService.hash(DEFAULT_PASSWORD),
            phoneNumber: "",
          },
          include: {
            role: true,
          },
        });
      }

      const device = await this.deviceRepository.createDevice({
        userId: user.id,
        userAgent: validatedState.userAgent,
        ip: validatedState.ip,
        isActive: true,
      });

      const authTokens = await this.authService.generateTokens({
        userId: user.id,
        roleId: user.roleId,
        roleName: user.role.name,
        deviceId: device.id,
      });

      return authTokens;
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Invalid state data.",
      });
    }
  }
}
