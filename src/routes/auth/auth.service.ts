import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Device } from "@prisma/client";
import { addMilliseconds } from "date-fns";
import ms from "ms";
import { LoginRequestDto, LoginResponseDto } from "src/dtos/auth/login.dto";
import {
  RegisterRequestDto,
  RegisterResponseDto,
} from "src/dtos/auth/register.dto";

import { RoleService } from "./role.service";

import { VerificationCodeType } from "@/constants/verification-code.constant";
import { LogoutResponseDto } from "@/dto/auth/logout.dto";
import { RefreshTokenResponseDto } from "@/dto/auth/refresh-token.dto";
import { SendOTPRequestDto } from "@/dto/auth/send-otp.dto";
import { DeviceRepository } from "@/repositories/device/device.repository";
import { RefreshTokenRepository } from "@/repositories/refresh-token/refresh-token.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { UserRepository } from "@/repositories/user/user.repository";
import { UserInputData } from "@/repositories/user/user.repository.type";
import { VerificationCodeRepository } from "@/repositories/verification-code/verification-code.repository";
import { AppConfigService } from "@/shared/services/app-config.service";
import { EmailService } from "@/shared/services/email.service";
import { HashingService } from "@/shared/services/hashing.service";
import { TokenService } from "@/shared/services/token.service";
import { generateOTP } from "@/shared/utils/generate-otp.util";
import {
  AccessTokenPayloadCreate,
  RefreshTokenPayloadCreate,
} from "@/types/jwt-payload.type";

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly roleService: RoleService,
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly verificationCodeRepository: VerificationCodeRepository,
    private readonly configService: AppConfigService,
    private readonly emailService: EmailService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  async register(data: RegisterRequestDto): Promise<RegisterResponseDto> {
    const verificationCode = await this.verificationCodeRepository.findUnique({
      where: {
        email: data.email,
        code: data.code,
        type: VerificationCodeType.REGISTER,
      },
    });

    if (!verificationCode) {
      throw new UnprocessableEntityException([
        { message: "Verification code is not valid.", path: "code" },
      ]);
    }

    if (verificationCode.expiresAt < new Date()) {
      throw new UnprocessableEntityException([
        { message: "Verification code is expired.", path: "code" },
      ]);
    }

    const hashedPassword = this.hashingService.hash(data.password);

    const roleId = await this.roleService.getClientRoleId();

    const createUserInputData: UserInputData = {
      email: data.email,
      name: data.name,
      phoneNumber: data.phoneNumber,
      password: hashedPassword,
      roleId,
    };

    const user = await this.userRepository.createUser(createUserInputData);

    await this.verificationCodeRepository.deleteVerificationCode({
      where: {
        email: data.email,
      },
    });

    return user;
  }

  async login(
    data: LoginRequestDto & Pick<Device, "ip" | "userAgent">,
  ): Promise<LoginResponseDto> {
    // 1. Find User by Email
    const user = await this.sharedUserRepository.findUnique({
      where: {
        email: data.email,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new BadRequestException([
        { message: "Email is not found.", path: "email" },
      ]);
    }

    // 2. Verify Password
    const isPasswordValid = this.hashingService.compare(
      data.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException([
        { message: "Password is not valid.", path: "password" },
      ]);
    }

    const device = await this.deviceRepository.createDevice({
      userId: user.id,
      ip: data.ip,
      isActive: true,
      userAgent: data.userAgent,
    });

    const tokens = await this.generateTokens({
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
      deviceId: device.id,
    });

    return tokens;
  }

  private async generateTokens(
    payload: AccessTokenPayloadCreate & RefreshTokenPayloadCreate,
  ) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({
        userId: payload.userId,
        deviceId: payload.deviceId,
        roleId: payload.roleId,
        roleName: payload.roleName,
      }),

      this.tokenService.signRefreshToken({
        userId: payload.userId,
        expiresIn: payload.expiresIn,
      }),
    ]);

    const decodedRefreshToken =
      await this.tokenService.verifyRefreshToken(refreshToken);

    await this.refreshTokenRepository.createRefreshToken({
      token: refreshToken,
      userId: payload.userId,
      expiresAt: new Date(decodedRefreshToken.exp * 1000),
      deviceId: payload.deviceId,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken({
    refreshToken: oldRefreshToken,
    ip,
    userAgent,
  }: {
    refreshToken: string;
  } & Pick<Device, "ip" | "userAgent">): Promise<RefreshTokenResponseDto> {
    const { userId, exp } =
      await this.tokenService.verifyRefreshToken(oldRefreshToken);

    const refreshTokenInDb =
      await this.refreshTokenRepository.findUniqueOrThrow({
        where: {
          token: oldRefreshToken,
        },
        select: {
          user: {
            select: {
              role: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
          deviceId: true,
        },
      });

    const $deleteOldRefreshToken = this.refreshTokenRepository.delete({
      where: {
        token: oldRefreshToken,
      },
    });

    const $updateDevice = this.deviceRepository.updateDevice({
      where: {
        id: refreshTokenInDb.deviceId,
      },
      data: {
        ip,
        userAgent,
      },
    });

    // Handle rotate refresh token
    const oldRefreshTokenExpiresIn = exp - Math.floor(Date.now() / 1000);

    const $generateTokens = this.generateTokens({
      userId,
      deviceId: refreshTokenInDb.deviceId,
      roleId: refreshTokenInDb.user.role.id,
      roleName: refreshTokenInDb.user.role.name,
      expiresIn: oldRefreshTokenExpiresIn,
    });

    const [_, __, tokens] = await Promise.all([
      $deleteOldRefreshToken,
      $updateDevice,
      $generateTokens,
    ]);

    return tokens;
  }

  async logout({
    refreshToken,
  }: {
    refreshToken: string;
  }): Promise<LogoutResponseDto> {
    const deletedRefreshToken = await this.refreshTokenRepository.delete({
      where: {
        token: refreshToken,
      },
    });

    await this.deviceRepository.updateDevice({
      where: {
        id: deletedRefreshToken.deviceId,
      },
      data: {
        isActive: false,
      },
    });

    return {
      message: "Logout successfully.",
    };
  }

  async sendOTP(data: SendOTPRequestDto) {
    const user = await this.sharedUserRepository.findUnique({
      where: {
        email: data.email,
      },
    });

    if (user) {
      throw new UnprocessableEntityException([
        {
          message: "Email is already exist.",
          path: "email",
        },
      ]);
    }

    const code = generateOTP();

    const otpExpiresIn = this.configService.appConfig
      .otpExpiresIn as Parameters<typeof ms>[0];

    const verificationCode =
      await this.verificationCodeRepository.createVerificationCode({
        code,
        email: data.email,
        type: VerificationCodeType.REGISTER,
        expiresAt: addMilliseconds(new Date(), ms(otpExpiresIn)),
      });

    // SEND EMAIL SERVICE - RESEND
    // const { error } = await this.emailService.sendEmail({
    //   email: this.configService.appConfig.sandboxEmail || data.email,
    //   code: verificationCode.code,
    // });

    // if (error) {
    //   throw new UnprocessableEntityException([
    //     { message: "Failed to send email.", path: "email" },
    //   ]);
    // }

    return verificationCode;
  }
}
