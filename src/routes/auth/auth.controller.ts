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
import { ApiBody, ApiOperation, ApiResponse } from "@nestjs/swagger";
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

  @Post("register")
  @IsPublicApi()
  @ApiOperation({ summary: "Register a new user" })
  @ApiBody({ type: RegisterRequestDto, description: "User registration data" })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    type: RegisterResponseDto,
  })
  async register(
    @Body() data: RegisterRequestDto,
  ): Promise<RegisterResponseDto> {
    const response = await this.authService.register(data);

    return new RegisterResponseDto(response);
  }

  @Post("login")
  @IsPublicApi()
  @ApiOperation({ summary: "Login user" })
  @ApiBody({ type: LoginRequestDto, description: "User login data" })
  @ApiResponse({
    status: 201,
    description: "User logged in successfully",
    type: LoginResponseDto,
  })
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
  @Post("refresh-token")
  @IsPublicApi()
  @ApiOperation({ summary: "Refresh access token" })
  @ApiBody({ type: RefreshTokenRequestDto, description: "Refresh token data" })
  @ApiResponse({
    status: 201,
    description: "Access token refreshed successfully",
    type: RefreshTokenResponseDto,
  })
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
  @Post("logout")
  @ApiOperation({ summary: "Logout user" })
  @ApiBody({ type: LogoutRequestDto, description: "Logout data" })
  @ApiResponse({
    status: 201,
    description: "User logged out successfully",
    type: LogoutResponseDto,
  })
  async logout(@Body() data: LogoutRequestDto): Promise<LogoutResponseDto> {
    const response = await this.authService.logout({
      ...data,
    });

    return new LogoutResponseDto(response);
  }

  @Post("otp")
  @IsPublicApi()
  @ApiOperation({ summary: "Send OTP" })
  @ApiBody({ type: SendOTPRequestDto, description: "Send OTP data" })
  @ApiResponse({
    status: 201,
    description: "OTP sent successfully",
    type: SendOTPResponseDto,
  })
  async sendOTP(@Body() data: SendOTPRequestDto): Promise<SendOTPResponseDto> {
    const response = await this.authService.sendOTP(data);

    return new SendOTPResponseDto(response);
  }

  @Get("google/authorization-url")
  @IsPublicApi()
  @ApiOperation({ summary: "Get Google authorization URL" })
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
  @ApiOperation({ summary: "Forgot password" })
  @ApiBody({
    type: ForgotPasswordRequestDto,
    description: "Forgot password data",
  })
  @ApiResponse({
    status: 201,
    description: "Password reset email sent successfully",
    type: ForgotPasswordResponseDto,
  })
  @IsPublicApi()
  async forgotPassword(@Body() data: ForgotPasswordRequestDto) {
    const response = await this.authService.forgotPassword(data);

    return new ForgotPasswordResponseDto(response);
  }

  @Post("2fa/enable")
  @ApiOperation({ summary: "Enable 2FA" })
  @ApiResponse({
    status: 201,
    description: "2FA enabled successfully",
    type: EnableTwoFactorAuthenticationResponseDto,
  })
  async enable2fa(@ActiveUser("userId") userId: number) {
    const response =
      await this.authService.setupTwoFactorAuthentication(userId);

    return new EnableTwoFactorAuthenticationResponseDto(response);
  }

  @Post("2fa/disable")
  @ApiOperation({ summary: "Disable 2FA" })
  @ApiBody({ type: Disable2faRequestDto, description: "Disable 2FA data" })
  @ApiResponse({
    status: 201,
    description: "2FA disabled successfully",
    type: Disable2faResponseDto,
  })
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
