import { Injectable, Logger } from "@nestjs/common";
import { Device } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { z } from "zod";

import { AuthService } from "./auth.service";
import { RoleService } from "./role.service";

import { DeviceRepository } from "@/repositories/device/device.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { AppConfigService } from "@/shared/services/app-config.service";
import { HashingService } from "@/shared/services/hashing.service";

const DEFAULT_PASSWORD = "changeme";

@Injectable()
export class GoogleService {
  private logger = new Logger(GoogleService.name);

  private oauth2Client: OAuth2Client;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly hashingService: HashingService,
    private readonly roleService: RoleService,
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

      let user = await this.sharedUserRepository.findUnique({
        where: {
          email: data.email,
        },
        include: {
          role: true,
        },
      });

      if (!user) {
        // Create new user
        const clientRoleId = await this.roleService.getClientRoleId();

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
      if (error instanceof Error) {
        this.logger.error("Failed to get user info from Google.", error.stack);
      }

      throw new Error("Invalid state data.");
    }
  }
}
