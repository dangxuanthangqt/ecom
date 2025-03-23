import { Body, Controller, Ip, Post } from "@nestjs/common";
import { Device } from "@prisma/client";
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

import { LogoutResponseDto } from "@/dto/auth/logout.dto";
import {
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
} from "@/dto/auth/refresh-token.dto";
import { SendOTPRequestDto, SendOTPResponseDto } from "@/dto/auth/send-otp.dto";
import { UserAgent } from "@/shared/decorators/user-agent.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(
    @Body() data: RegisterRequestDto,
  ): Promise<RegisterResponseDto> {
    const response = await this.authService.register(data);

    return new RegisterResponseDto(response);
  }

  @Post("login")
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
  async sendOTP(@Body() data: SendOTPRequestDto): Promise<SendOTPResponseDto> {
    const response = await this.authService.sendOTP(data);

    return new SendOTPResponseDto(response);
  }
}
