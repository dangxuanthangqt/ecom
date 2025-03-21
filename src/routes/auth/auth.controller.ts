import { Body, Controller, Post } from "@nestjs/common";
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

import { SendOTPRequestDto, SendOTPResponseDto } from "@/dto/auth/send-otp.dto";

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
  async login(@Body() data: LoginRequestDto): Promise<LoginResponseDto> {
    const response = await this.authService.login(data);

    return new LoginResponseDto(response);
  }

  @Post("otp")
  async sendOTP(@Body() data: SendOTPRequestDto): Promise<SendOTPResponseDto> {
    const response = await this.authService.sendOTP(data);

    return new SendOTPResponseDto(response);
  }
}
