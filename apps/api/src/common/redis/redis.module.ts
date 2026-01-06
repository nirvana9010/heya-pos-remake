import { Module, Global } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-redis-store";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RedisService } from "./redis.service";

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisEnabled =
          configService.get("REDIS_ENABLED", "false") === "true";

        if (!redisEnabled) {
          // Use in-memory cache if Redis is not enabled
          return {
            ttl: 300, // 5 minutes default TTL
            max: 100, // Maximum number of items in cache
          };
        }

        return {
          store: redisStore,
          host: configService.get("REDIS_HOST", "localhost"),
          port: configService.get("REDIS_PORT", 6379),
          ttl: 300, // 5 minutes default TTL
          password: configService.get("REDIS_PASSWORD"),
          db: configService.get("REDIS_DB", 0),
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [CacheModule, RedisService],
})
export class RedisModule {}
