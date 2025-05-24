import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleService } from "./google.service";

import { DeviceRepository } from "@/repositories/device/device.repository";
import { RefreshTokenRepository } from "@/repositories/refresh-token/refresh-token.repository";
import { SharedRoleRepository } from "@/repositories/role/shared-role.repository";
import { SharedUserRepository } from "@/repositories/user/shared-user.repository";
import { UserRepository } from "@/repositories/user/user.repository";
import { VerificationCodeRepository } from "@/repositories/verification-code/verification-code.repository";

@Module({
  controllers: [AuthController],
  providers: [
    SharedRoleRepository,
    AuthService,
    UserRepository,
    SharedUserRepository,
    VerificationCodeRepository,
    RefreshTokenRepository,
    DeviceRepository,
    GoogleService,
  ],
  // exports: [SharedUserRepository],
})
export class AuthModule {}
