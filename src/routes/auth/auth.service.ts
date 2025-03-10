import { Injectable, UnauthorizedException } from "@nestjs/common";
import { LoginRequestDto, LoginResponseDto } from "src/dtos/auth/login.dto";
import {
  RegisterRequestDto,
  RegisterResponseDto,
} from "src/dtos/auth/register.dto";

import { RoleService } from "./role.service";

// import { VerificationCodeRequestDto } from "@/dto/auth/verification-code.dto";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { UserRepository } from "@/repositories/user/user.repository";
import { UserInputData } from "@/repositories/user/user.repository.type";
import { HashingService } from "@/shared/services/hashing.service";
import { PrismaService } from "@/shared/services/prisma.service";
import { TokenService } from "@/shared/services/token.service";
import { AccessTokenPayloadCreate } from "@/types/jwt-payload.type";

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly roleService: RoleService,
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository,
    private readonly sharedUserRepository: SharedUserRepository,
  ) {}

  async register(data: RegisterRequestDto): Promise<RegisterResponseDto> {
    const hashedPassword = this.hashingService.hash(data.password);

    const roleId = await this.roleService.getClientRoleId();

    const createUserInputData: UserInputData = {
      email: data.email,
      name: data.name,
      phoneNumber: data.phoneNumber,
      password: hashedPassword,
      roleId,
    };

    const user = await this.userRepository.createUser({
      ...createUserInputData,
      password: hashedPassword,
      roleId,
    });

    return user;
  }

  // async sendOTP(data: VerificationCodeRequestDto) {}

  async login(data: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: data.email,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Email is not found.");
    }

    const isPasswordValid = this.hashingService.compare(
      data.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Password is not valid.");
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
      deviceId: 123,
    });

    return tokens;
  }

  private async generateTokens(payload: AccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({
        userId: payload.userId,
        deviceId: payload.deviceId,
        roleId: payload.roleId,
        roleName: payload.roleName,
      }),

      this.tokenService.signRefreshToken({
        userId: payload.userId,
      }),
    ]);

    const decodedRefreshToken =
      await this.tokenService.verifyRefreshToken(refreshToken);

    await this.prismaService.refreshToken.create({
      data: {
        token: refreshToken,
        userId: payload.userId,
        expiresAt: new Date(decodedRefreshToken.exp * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const { userId } =
        await this.tokenService.verifyRefreshToken(refreshToken);

      const refreshTokenInDb =
        await this.prismaService.refreshToken.findUniqueOrThrow({
          where: {
            token: refreshToken,
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
          },
        });

      await this.prismaService.refreshToken.delete({
        where: {
          token: refreshToken,
        },
      });

      await this.generateTokens({
        userId,
        deviceId: 123,
        roleId: refreshTokenInDb.user.role.id,
        roleName: refreshTokenInDb.user.role.name,
      });
    } catch {
      throw new UnauthorizedException("Refresh token is not valid.");
    }
  }
}
