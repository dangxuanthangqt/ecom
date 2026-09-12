import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

import { AppConfigService } from "./app-config.service";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  readonly client: Redis;

  constructor(private readonly appConfigService: AppConfigService) {
    this.client = new Redis(this.appConfigService.appConfig.redisUrl, {
      maxRetriesPerRequest: 2,
      // Fail a command immediately while the socket is down instead of queueing
      // it until the connection comes back. Without this, a Redis outage makes
      // every cached lookup (and so every authenticated request) block for
      // seconds before falling back to Postgres, turning graceful degradation
      // into an API-wide stall.
      enableOfflineQueue: false,
      connectTimeout: 3000,
      // Bounds the other failure mode: socket open but Redis not answering
      // (blocked/overloaded). Generous next to a sub-5ms local GET.
      commandTimeout: 1000,
      // Keep reconnecting in the background, capped, so caching resumes by
      // itself once Redis is healthy again.
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
    });

    this.client.on("error", (error: Error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      // `quit()` rejects when the connection is already down (the offline
      // queue is disabled), which must not turn into a failed shutdown.
      this.logger.error(
        `Failed to quit Redis cleanly, forcing disconnect: ${(error as Error).message}`,
      );
      this.client.disconnect();
    }
  }
}
