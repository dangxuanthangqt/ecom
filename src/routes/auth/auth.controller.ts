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
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Device } from "@prisma/client";
import { Response } from "express";
import {
  LoginRequestDto,
  //   LoginRequestZodDto,
  LoginResponseDto,
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
  EnableTwoFactorAuthenticationResponseDto,
} from "@/dto/auth/2fa.dto";
import {
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
} from "@/dto/auth/forgot-password.dto";
import { LogoutRequestDto, LogoutResponseDto } from "@/dto/auth/logout.dto";
import {
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
} from "@/dto/auth/refresh-token.dto";
import { SendOTPRequestDto, SendOTPResponseDto } from "@/dto/auth/send-otp.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { IsPublicApi } from "@/shared/decorators/auth-api.decorator";
import { ApiAuth, ApiPublic } from "@/shared/decorators/http-decorator";
import { UserAgent } from "@/shared/decorators/user-agent.decorator";
import { AppConfigService } from "@/shared/services/app-config.service";

@Controller("auth")
export class AuthController {
  private logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly googleService: GoogleService,
    private readonly appConfigService: AppConfigService,
  ) {}

  @ApiPublic({
    type: RegisterResponseDto,
    options: {
      summary: "Register user",
      description: "Register",
    },
  })
  @Post("register")
  @IsPublicApi()
  async register(
    @Body() data: RegisterRequestDto,
  ): Promise<RegisterResponseDto> {
    const response = await this.authService.register(data);

    return new RegisterResponseDto(response);
  }

  @ApiPublic({
    type: LoginResponseDto,
    options: {
      summary: "Login user",
      description: "Login",
    },
  })
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

  @ApiPublic({
    type: RefreshTokenResponseDto,
    options: {
      summary: "Refresh token",
      description: "Refresh token",
    },
  })
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

  @ApiAuth({
    type: LogoutResponseDto,
    options: {
      summary: "Logout user",
      description: "Logout",
    },
  })
  @Post("logout")
  async logout(@Body() data: LogoutRequestDto): Promise<LogoutResponseDto> {
    const response = await this.authService.logout({
      ...data,
    });

    return new LogoutResponseDto(response);
  }

  @ApiPublic({
    type: SendOTPResponseDto,
    options: {
      summary: "Send OTP",
      description: "Send OTP",
    },
  })
  @Post("otp")
  @IsPublicApi()
  async sendOTP(@Body() data: SendOTPRequestDto): Promise<SendOTPResponseDto> {
    const response = await this.authService.sendOTP(data);

    return new SendOTPResponseDto(response);
  }

  @Get("google/authorization-url")
  @IsPublicApi()
  @ApiResponse({
    status: 200,
    description: "Google authorization URL",
    schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          example: "https://accounts.google.com/o/oauth2/v2/auth?...",
        },
      },
    },
  })
  getAuthorizationUrl(
    @Ip() ip: string,
    @UserAgent() userAgent: Device["userAgent"],
  ) {
    const url = this.googleService.getAuthorizationUrl({ ip, userAgent });

    return { url };
  }

  @Get("google/callback")
  @ApiOperation({ summary: "Google callback" })
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
      this.logger.error(error);

      const searchParams = new URLSearchParams({
        errorMessage: "Failed to google login.",
      });

      const queryParams = searchParams.toString();

      return res.redirect(`${googleClientRedirectUri}?${queryParams}`);
    }
  }

  @ApiPublic({
    type: ForgotPasswordResponseDto,
    options: {
      summary: "Forgot password",
      description: "Forgot password",
    },
  })
  @Post("forgot-password")
  @IsPublicApi()
  async forgotPassword(@Body() data: ForgotPasswordRequestDto) {
    const response = await this.authService.forgotPassword(data);

    return new ForgotPasswordResponseDto(response);
  }

  @ApiAuth({
    type: EnableTwoFactorAuthenticationResponseDto,
    options: {
      summary: "Enable 2FA",
      description: "Enable 2FA",
    },
  })
  @Post("2fa/enable")
  async enable2fa(@ActiveUser("userId") userId: number) {
    const response =
      await this.authService.setupTwoFactorAuthentication(userId);

    return new EnableTwoFactorAuthenticationResponseDto(response);
  }

  @ApiAuth({
    type: Disable2faResponseDto,
    options: {
      summary: "Disable 2FA",
      description: "Disable 2FA",
    },
  })
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
