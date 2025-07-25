import { Injectable } from "@nestjs/common";
import { Device, User } from "@prisma/client";
import { addMilliseconds } from "date-fns";
import ms from "ms";

import {
  VerificationCodeType,
  VerificationCodeTypeType,
} from "@/constants/verification-code.constant";
import { Disable2faRequestDto } from "@/dtos/auth/2fa.dto";
import {
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
} from "@/dtos/auth/forgot-password.dto";
import { LogoutResponseDto } from "@/dtos/auth/logout.dto";
import {
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
} from "@/dtos/auth/refresh-token.dto";
import { SendOTPRequestDto } from "@/dtos/auth/send-otp.dto";
import { DeviceRepository } from "@/repositories/device/device.repository";
import { RefreshTokenRepository } from "@/repositories/refresh-token/refresh-token.repository";
import { SharedRoleRepository } from "@/repositories/role/shared-role.repository";
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
import throwHttpException from "@/shared/utils/throw-http-exception.util";
import {
  AccessTokenPayloadCreate,
  RefreshTokenPayloadCreate,
} from "@/types/jwt-payload.type";
import { LoginRequestDto, LoginResponseDto } from "src/dtos/auth/login.dto";
import {
  RegisterRequestDto,
  RegisterResponseDto,
} from "src/dtos/auth/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly sharedRoleRepository: SharedRoleRepository,
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

  /**
   * Validates the verification code for a given email and type.
   *
   * @param data - The data containing email, code, and type of verification.
   * @throws HttpException if the verification code is not valid or expired.
   */
  async validateVerificationCode(data: {
    email: string;
    code: string;
    type: VerificationCodeTypeType;
  }) {
    const verificationCode = await this.verificationCodeRepository.findUnique({
      where: {
        email_code_type: {
          // Dùng fined unique mới có thể dùng được field này, find first, find many không dùng được
          email: data.email,
          code: data.code,
          type: data.type,
        },
      },
    });

    if (!verificationCode) {
      throwHttpException({
        type: "unprocessable",
        message: "Verification code is not valid.",
      });
    }

    if (verificationCode.expiresAt < new Date()) {
      throwHttpException({
        type: "unprocessable",
        message: "Verification code is expired.",
      });
    }
  }

  /**
   * Registers a new user with the provided data.
   *
   * @param data - The registration data containing email, code, password, name, and phone number.
   * @returns The registered user details.
   * @throws HttpException if the verification code is invalid or if the email already exists.
   */
  async register(data: RegisterRequestDto): Promise<RegisterResponseDto> {
    await this.validateVerificationCode({
      email: data.email,
      code: data.code,
      type: VerificationCodeType.REGISTER,
    });

    const hashedPassword = this.hashingService.hash(data.password);

    const clientRoleId = await this.sharedRoleRepository.getClientRoleId();

    const createUserInputData: UserInputData = {
      email: data.email,
      name: data.name,
      phoneNumber: data.phoneNumber,
      password: hashedPassword,
      roleId: clientRoleId,
    };

    const [user] = await Promise.all([
      this.userRepository.registerUser(createUserInputData),
      this.verificationCodeRepository.deleteVerificationCode({
        where: {
          email: data.email,
        },
      }),
    ]);

    return user;
  }

  /**
   * Logs in a user with the provided credentials.
   *
   * @param body - The login request data containing email, password, totpCode, or code.
   * @param ip - The IP address of the device making the request.
   * @param userAgent - The user agent of the device making the request.
   * @returns The access and refresh tokens for the logged-in user.
   * @throws HttpException if the email is not found, password is invalid, or TOTP verification fails.
   */
  async login({
    body,
    ip,
    userAgent,
  }: {
    body: LoginRequestDto;
    ip: Device["ip"];
    userAgent: Device["userAgent"];
  }): Promise<LoginResponseDto> {
    // 1. Find User by Email
    const user = await this.sharedUserRepository.findFirst({
      where: {
        email: body.email,
        deletedAt: null,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throwHttpException({
        type: "badRequest",
        message: "Email is not found.",
        field: "email",
      });
    }

    if (user.totpSecret) {
      if (!body.totpCode && !body.code) {
        throwHttpException({
          type: "badRequest",
          field: "totpCode",
          message: "TOTP or verification code is required.",
        });
      }

      if (body.totpCode) {
        const isTOTPCodeValid =
          this.twoFactorAuthenticationService.verifyTOTPCode({
            email: user.email,
            secret: user.totpSecret,
            totpCode: body.totpCode,
          });

        if (!isTOTPCodeValid) {
          throwHttpException({
            type: "unprocessable",
            message: "TOTP code is not valid.",
          });
        }
      } else {
        await this.validateVerificationCode({
          email: user.email,
          code: body.code,
          type: VerificationCodeType.LOGIN,
        });
      }
    }

    // 2. Verify Password
    const isPasswordValid = this.hashingService.compare(
      body.password,
      user.password,
    );

    if (!isPasswordValid) {
      throwHttpException({
        type: "badRequest",
        message: "Password is not valid.",
        field: "password",
      });
    }

    const device = await this.deviceRepository.createDevice({
      userId: user.id,
      ip,
      isActive: true,
      userAgent,
    });

    const tokens = await this.generateTokens({
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
      deviceId: device.id,
    });

    return tokens;
  }

  /**
   * Generates access and refresh tokens for the user.
   *
   * @param payload - The payload containing user ID, device ID, role ID, role name, and expiration time.
   * @returns An object containing the generated access and refresh tokens.
   */
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

  /**
   * Refreshes the access token using the provided refresh token.
   *
   * @param body - The request body containing the refresh token.
   * @param ip - The IP address of the device making the request.
   * @param userAgent - The user agent of the device making the request.
   * @returns The new access and refresh tokens.
   * @throws HttpException if the refresh token is invalid or expired.
   */
  async refreshToken({
    body,
    ip,
    userAgent,
  }: {
    body: RefreshTokenRequestDto;
    ip: Device["ip"];
    userAgent: Device["userAgent"];
  }): Promise<RefreshTokenResponseDto> {
    const oldRefreshToken = body.refreshToken;

    const { userId, exp } =
      await this.tokenService.verifyRefreshToken(oldRefreshToken);

    const refreshTokenInDb =
      await this.refreshTokenRepository.findUniqueOrThrow({
        where: {
          token: oldRefreshToken,
          deletedAt: null,
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

    // Khi người dùng sử dụng refresh token, thông tin về thiết bị của họ (như địa chỉ IP hoặc user agent) có thể đã thay đổi so với lần đăng nhập ban đầu.
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

  /**
   * Logs out the user by deleting the refresh token and deactivating the device.
   *
   * @param refreshToken - The refresh token to be deleted.
   * @returns A message indicating successful logout.
   */
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

  /**
   * Sends an OTP to the user's email for verification.
   *
   * @param data - The request data containing email and type of verification.
   * @returns The created verification code.
   * @throws HttpException if the email already exists for registration or does not exist for forgot password.
   */
  async sendOTP(data: SendOTPRequestDto) {
    const user = await this.sharedUserRepository.findFirst({
      where: {
        email: data.email,
        deletedAt: null,
      },
    });

    if (data.type === VerificationCodeType.REGISTER && user) {
      throwHttpException({
        type: "unprocessable",
        message: "Email is already exist.",
      });
    }

    if (data.type === VerificationCodeType.FORGOT_PASSWORD && !user) {
      throwHttpException({
        type: "unprocessable",
        message: "Email is not exist.",
      });
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

  /**
   * Resets the user's password using the provided verification code.
   *
   * @param code - The verification code sent to the user's email.
   * @param email - The user's email address.
   * @param password - The new password to be set.
   * @returns A message indicating successful password update.
   * @throws HttpException if the verification code is invalid or expired, or if the user does not exist.
   */
  async forgotPassword({
    code,
    email,
    password,
  }: ForgotPasswordRequestDto): Promise<ForgotPasswordResponseDto> {
    const user = await this.sharedUserRepository.findFirstOrThrow({
      where: {
        email,
        deletedAt: null,
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
          updatedById: user.id,
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

  /**
   * Sets up two-factor authentication (2FA) for the user.
   *
   * @param userid - The ID of the user to set up 2FA for.
   * @returns An object containing the generated secret and URI for 2FA setup.
   * @throws HttpException if 2FA is already enabled for the user.
   */
  async setupTwoFactorAuthentication(userid: User["id"]) {
    // 1: Check user info and 2fa status
    const user = await this.sharedUserRepository.findUniqueOrThrow({
      where: {
        id: userid,
        deletedAt: null,
      },
    });

    if (user.totpSecret) {
      throwHttpException({
        type: "unprocessable",
        message: "2FA is already enabled.",
      });
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
        updatedById: user.id,
      },
    });

    // 4: Send uri to user
    return {
      secret,
      uri,
    };
  }

  /**
   * Disables two-factor authentication (2FA) for the user.
   *
   * @param userId - The ID of the user to disable 2FA for.
   * @param totpCode - The TOTP code provided by the user.
   * @param code - The verification code provided by the user.
   * @returns A message indicating successful disabling of 2FA.
   * @throws HttpException if 2FA is not enabled or if the TOTP code is invalid.
   */
  async disableTwoFactorAuthentication({
    userId,
    totpCode,
    code,
  }: Disable2faRequestDto & {
    userId: User["id"];
  }) {
    // 1: Check user info and 2fa status
    const user = await this.sharedUserRepository.findUniqueOrThrow({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user.totpSecret) {
      throwHttpException({
        type: "unprocessable",
        message: "2FA is not enabled.",
      });
    }

    if (totpCode) {
      const isValidTOTPCode =
        this.twoFactorAuthenticationService.verifyTOTPCode({
          email: user.email,
          secret: user.totpSecret,
          totpCode,
        });

      if (!isValidTOTPCode) {
        throwHttpException({
          type: "unprocessable",
          message: "TOTP code is not valid.",
        });
      }
    } else {
      if (code) {
        await this.validateVerificationCode({
          email: user.email,
          code,
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
        updatedById: user.id,
      },
    });

    return {
      message: "2FA has been disabled.",
    };
  }
}
