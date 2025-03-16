import { Global, Module, Provider } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AppConfigService } from "./services/app-config.service";
import { EmailService } from "./services/email.service";
import { HashingService } from "./services/hashing.service";
import { PrismaService } from "./services/prisma.service";
import { TokenService } from "./services/token.service";

const sharedProviders: Provider[] = [
  AppConfigService,
  PrismaService,
  HashingService,
  TokenService,
  EmailService,
];

@Global()
@Module({
  imports: [JwtModule],
  providers: sharedProviders,
  exports: sharedProviders, // Exporting providers to be used in other modules
})
export class SharedModule {}
