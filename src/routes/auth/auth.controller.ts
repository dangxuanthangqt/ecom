import {
  Body,
  Controller,
  Get,
  Ip,
  Logger,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { Device } from "@prisma/client";
import { Response } from "express";
import {
  LoginRequestDto,
  //   LoginRequestZodDto,
  LoginResponseDto,
  //   LoginResponseZodDto,
} from "src/dtos/auth/login.dto";
import {
  RegisterRequestDto,
  RegisterResponseDto,
} from "src/dtos/auth/register.dto";

import { AuthService } from "./auth.service";
import { GoogleService } from "./google.service";

import {
  Disable2faRequestDto,
  Disable2faResponseDto,
  TwoFactorAuthenticationResponseDto,
} from "@/dto/auth/2fa.dto";
import {
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
} from "@/dto/auth/forgot-password.dto";
import { LogoutResponseDto } from "@/dto/auth/logout.dto";
import {
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
} from "@/dto/auth/refresh-token.dto";
import { SendOTPRequestDto, SendOTPResponseDto } from "@/dto/auth/send-otp.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { IsPublicApi } from "@/shared/decorators/auth-api.decorator";
import { UserAgent } from "@/shared/decorators/user-agent.decorator";
import { TwoFactorAuthenticationService } from "@/shared/services/2fa.service";
import { AppConfigService } from "@/shared/services/app-config.service";

@Controller("auth")
export class AuthController {
  private logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly googleService: GoogleService,
    private readonly appConfigService: AppConfigService,
    private readonly twoFactorAuthenticationService: TwoFactorAuthenticationService,
  ) {}

  @Post("register")
  @IsPublicApi()
  async register(
    @Body() data: RegisterRequestDto,
  ): Promise<RegisterResponseDto> {
    const response = await this.authService.register(data);

    return new RegisterResponseDto(response);
  }

  @Post("login")
  @IsPublicApi()
  // @ZodSerializerDto(LoginResponseZodDto) // /** It's run after global TransformInterceptor*/
  async login(
    @Body() data: LoginRequestDto,
    @Ip() ip: string,
    @UserAgent() userAgent: Device["userAgent"],
  ): Promise<LoginResponseDto> {
    const response = await this.authService.login({
      ...data,
      ip,
      userAgent,
    });

    return new LoginResponseDto(response);
  }

  @Post("refresh-token")
  @IsPublicApi()
  async refreshToken(
    @Body() data: RefreshTokenRequestDto,
    @Ip() ip: string,
    @UserAgent() userAgent: Device["userAgent"],
  ): Promise<RefreshTokenResponseDto> {
    const response = await this.authService.refreshToken({
      ...data,
      ip,
      userAgent,
    });

    return new LoginResponseDto(response);
  }

  @Post("logout")
  async logout(
    @Body() data: RefreshTokenRequestDto,
  ): Promise<LogoutResponseDto> {
    const response = await this.authService.logout({
      ...data,
    });

    return new LogoutResponseDto(response);
  }

  @Post("otp")
  @IsPublicApi()
  async sendOTP(@Body() data: SendOTPRequestDto): Promise<SendOTPResponseDto> {
    const response = await this.authService.sendOTP(data);

    return new SendOTPResponseDto(response);
  }

  @Get("google/authorization-url")
  @IsPublicApi()
  getAuthorizationUrl(
    @Ip() ip: string,
    @UserAgent() userAgent: Device["userAgent"],
  ) {
    const url = this.googleService.getAuthorizationUrl({ ip, userAgent });

    return { url };
  }

  @Get("google/callback")
  @IsPublicApi()
  async googleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    const googleClientRedirectUri =
      this.appConfigService.appConfig.googleRedirectClientUri;

    try {
      const { refreshToken, accessToken } =
        await this.googleService.googleCallback(code, state);

      const searchParams = new URLSearchParams({ refreshToken, accessToken });

      const queryParams = searchParams.toString();

      return res.redirect(`${googleClientRedirectUri}?${queryParams}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to google callback`, error.stack);
      }

      const searchParams = new URLSearchParams({
        errorMessage: "Failed to google login.",
      });

      const queryParams = searchParams.toString();

      return res.redirect(`${googleClientRedirectUri}?${queryParams}`);
    }
  }

  @Post("forgot-password")
  @IsPublicApi()
  async forgotPassword(@Body() data: ForgotPasswordRequestDto) {
    const response = await this.authService.forgotPassword(data);

    return new ForgotPasswordResponseDto(response);
  }

  @Post("2fa/enable")
  async enable2fa(@ActiveUser("userId") userId: number) {
    const response =
      await this.authService.setupTwoFactorAuthentication(userId);

    return new TwoFactorAuthenticationResponseDto(response);
  }
  @Post("2fa/disable")
  async disable2fa(
    @Body() body: Disable2faRequestDto,
    @ActiveUser("userId") userId: number,
  ) {
    const response = await this.authService.disableTwoFactorAuthentication({
      ...body,
      userId,
    });

    return new Disable2faResponseDto(response);
  }
}
