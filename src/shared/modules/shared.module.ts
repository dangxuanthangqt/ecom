import { Global, Module, Provider } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { TwoFactorAuthenticationService } from "../services/2fa.service";
import { AppConfigService } from "../services/app-config.service";
import { EmailService } from "../services/email.service";
import { HashingService } from "../services/hashing.service";
import { PermissionResolverService } from "../services/permission-resolver.service";
import { PrismaService } from "../services/prisma.service";
import { RedisService } from "../services/redis.service";
import { RolePermissionCacheService } from "../services/role-permission-cache.service";
import { S3Service } from "../services/s3.service";
import { ThrottlerRedisStorage } from "../services/throttler-redis-storage.service";
import { TokenService } from "../services/token.service";

const sharedProviders: Provider[] = [
  AppConfigService,
  PrismaService,
  HashingService,
  TokenService,
  EmailService,
  TwoFactorAuthenticationService,
  S3Service,
  RedisService,
  RolePermissionCacheService,
  PermissionResolverService,
  ThrottlerRedisStorage,
];

@Global()
@Module({
  imports: [JwtModule],
  providers: sharedProviders,
  exports: sharedProviders, // Exporting providers to be used in other modules
})
export class SharedModule {}
