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

import {
  VerificationCodeType,
  VerificationCodeTypeType,
} from "@/constants/verification-code.constant";
import { Disable2faRequestDto } from "@/dto/auth/2fa.dto";
import {
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
} from "@/dto/auth/forgot-password.dto";
import { LogoutResponseDto } from "@/dto/auth/logout.dto";
import { RefreshTokenResponseDto } from "@/dto/auth/refresh-token.dto";
import { SendOTPRequestDto } from "@/dto/auth/send-otp.dto";
import { DeviceRepository } from "@/repositories/device/device.repository";
import { RefreshTokenRepository } from "@/repositories/refresh-token/refresh-token.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { UserRepository } from "@/repositories/user/user.repository";
import { UserInputData } from "@/repositories/user/user.repository.type";
import { VerificationCodeRepository } from "@/repositories/verification-code/verification-code.repository";
import { TwoFactorAuthenticationService } from "@/shared/services/2fa.service";
import { AppConfigService } from "@/shared/services/app-config.service";
// import { EmailService } from "@/shared/services/email.service";
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
    // private readonly emailService: EmailService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly twoFactorAuthenticationService: TwoFactorAuthenticationService,
  ) {}

  async validateVerificationCode(data: {
    email: string;
    code: string;
    type: VerificationCodeTypeType;
  }) {
    const verificationCode = await this.verificationCodeRepository.findUnique({
      where: {
        email_code_type: {
          email: data.email,
          code: data.code,
          type: data.type,
        },
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
  }

  async register(data: RegisterRequestDto): Promise<RegisterResponseDto> {
    await this.validateVerificationCode({
      email: data.email,
      code: data.code,
      type: VerificationCodeType.REGISTER,
    });

    const hashedPassword = this.hashingService.hash(data.password);

    const clientRoleId = await this.roleService.getClientRoleId();

    const createUserInputData: UserInputData = {
      email: data.email,
      name: data.name,
      phoneNumber: data.phoneNumber,
      password: hashedPassword,
      roleId: clientRoleId,
    };

    const [user] = await Promise.all([
      this.userRepository.createUser(createUserInputData),
      this.verificationCodeRepository.deleteVerificationCode({
        where: {
          email: data.email,
        },
      }),
    ]);

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

    if (user.totpSecret) {
      if (!data.totpCode && !data.code) {
        throw new UnprocessableEntityException([
          {
            message: "TOTP or verification code is required.",
            path: "totpCode",
          },
        ]);
      }

      if (data.totpCode) {
        const isTOTPCodeValid =
          this.twoFactorAuthenticationService.verifyTOTPCode({
            email: user.email,
            secret: user.totpSecret,
            totpCode: data.totpCode,
          });
        if (!isTOTPCodeValid) {
          throw new UnprocessableEntityException([
            { message: "TOTP code is not valid.", path: "totpCode" },
          ]);
        }
      } else {
        await this.validateVerificationCode({
          email: user.email,
          code: data.code,
          type: VerificationCodeType.LOGIN,
        });
      }
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

  async generateTokens(
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

    if (data.type === VerificationCodeType.REGISTER && user) {
      throw new UnprocessableEntityException([
        {
          message: "Email is already exist.",
          path: "email",
        },
      ]);
    }

    if (data.type === VerificationCodeType.FORGOT_PASSWORD && !user) {
      throw new UnprocessableEntityException([
        {
          message: "Email is not exist.",
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
        type: data.type,
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

  async forgotPassword({
    code,
    email,
    password,
  }: ForgotPasswordRequestDto): Promise<ForgotPasswordResponseDto> {
    const user = await this.sharedUserRepository.findUniqueOrThrow({
      where: {
        email,
      },
    });

    await this.validateVerificationCode({
      email,
      code,
      type: VerificationCodeType.FORGOT_PASSWORD,
    });

    const hashedPassword = this.hashingService.hash(password);

    await Promise.all([
      this.userRepository.updateUser({
        where: {
          id: user.id,
        },
        data: {
          password: hashedPassword,
        },
      }),
      this.verificationCodeRepository.deleteVerificationCode({
        where: {
          email,
        },
      }),
    ]);

    return {
      message: "Password has been updated.",
    };
  }

  async setupTwoFactorAuthentication(userid: number) {
    // 1: Check user info and 2fa status
    const user = await this.sharedUserRepository.findUniqueOrThrow({
      where: {
        id: userid,
      },
    });

    if (user.totpSecret) {
      throw new UnprocessableEntityException([
        { message: "2FA is already enabled.", path: "totpCode" },
      ]);
    }

    // 2: Generate secret key & uri
    const { secret, uri } =
      this.twoFactorAuthenticationService.generateTOTPSecret(user.email);

    // 3: Save secret key to user
    await this.userRepository.updateUser({
      where: {
        id: user.id,
      },
      data: {
        totpSecret: secret,
      },
    });

    // 4: Send uri to user
    return {
      secret,
      uri,
    };
  }

  async disableTwoFactorAuthentication({
    userId,
    totpCode,
    code,
  }: Disable2faRequestDto & {
    userId: number;
  }) {
    // 1: Check user info and 2fa status
    const user = await this.sharedUserRepository.findUniqueOrThrow({
      where: {
        id: userId,
      },
    });

    if (!user.totpSecret) {
      throw new UnprocessableEntityException([
        { message: "2FA is already disabled.", path: "totpCode" },
      ]);
    }

    if (totpCode) {
      const isValidTOTPCode =
        this.twoFactorAuthenticationService.verifyTOTPCode({
          email: user.email,
          secret: user.totpSecret,
          totpCode,
        });

      if (!isValidTOTPCode) {
        throw new UnprocessableEntityException([
          { message: "TOTP code is not valid.", path: "totpCode" },
        ]);
      }
    } else {
      if (code) {
        await this.validateVerificationCode({
          email: user.email,
          code: code,
          type: VerificationCodeType.DISABLE_2FA,
        });
      }
    }

    await this.userRepository.updateUser({
      where: {
        id: user.id,
      },
      data: {
        totpSecret: null,
      },
    });

    return {
      message: "2FA has been disabled.",
    };
  }
}
