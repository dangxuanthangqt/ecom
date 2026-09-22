import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

import { PrismaClient } from "@/generated/prisma/client";

import { createPrismaAdapter } from "../utils/prisma-client.util";

import { AppConfigService } from "./app-config.service";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  // The URL comes from `AppConfigService`, i.e. from the one env file
  // `ConfigModule` loaded and `validateEnv` checked — not from a `.env` the
  // client found by itself. Prisma 7 removed that implicit lookup, which is
  // exactly why this constructor exists: the connection string must be passed.
  constructor(appConfigService: AppConfigService) {
    super({
      adapter: createPrismaAdapter(appConfigService.appConfig.databaseUrl),
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Successfully connected to database");
    } catch (error) {
      this.logger.error("Failed to connect to database", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Disconnected from database");
  }
}
