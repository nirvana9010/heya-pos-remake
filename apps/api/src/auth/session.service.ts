import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { RedisService } from "../common/redis/redis.service";
import { AuthSession } from "../types";

interface SessionData extends AuthSession {
  lastActivity: string; // ISO string for Redis serialization
}

const SESSION_KEY_PREFIX = "session:";
const SESSION_TTL_MS =
  parseInt(process.env.SESSION_TIMEOUT_HOURS || "24") * 60 * 60 * 1000;
const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || "10000");
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const REDIS_HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
const REDIS_LOG_THROTTLE_MS = 60000; // 1 minute between repeated error logs

@Injectable()
export class SessionService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);

  // In-memory fallback for when Redis is unavailable
  private fallbackSessions: Map<
    string,
    SessionData & { lastActivityDate: Date }
  > = new Map();
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private healthCheckIntervalId: NodeJS.Timeout | null = null;

  private redisAvailable = true;
  private lastRedisErrorLog = 0;

  constructor(private readonly redisService: RedisService) {
    // Start health check for Redis connectivity
    this.startHealthCheck();
    // Start fallback cleanup interval (used when in fallback mode)
    this.startCleanupInterval();
  }

  async createSession(token: string, session: AuthSession): Promise<void> {
    const sessionData: SessionData = {
      ...session,
      lastActivity: new Date().toISOString(),
    };

    if (this.redisAvailable) {
      try {
        await this.redisService.set(
          `${SESSION_KEY_PREFIX}${token}`,
          sessionData,
          SESSION_TTL_SECONDS * 1000, // cache-manager expects ms
        );
        return;
      } catch {
        this.onRedisFailed();
      }
    }

    // Fallback to in-memory
    this.enforceMemoryLimits(session.user.id);
    this.fallbackSessions.set(token, {
      ...sessionData,
      lastActivityDate: new Date(),
    });
  }

  async getSession(token: string): Promise<AuthSession | null> {
    if (this.redisAvailable) {
      try {
        const session = await this.redisService.get<SessionData>(
          `${SESSION_KEY_PREFIX}${token}`,
        );

        if (!session) {
          return null;
        }

        // Check if token has expired
        if (new Date(session.expiresAt) < new Date()) {
          await this.removeSession(token);
          return null;
        }

        // Update last activity (refresh TTL)
        await this.redisService.set(
          `${SESSION_KEY_PREFIX}${token}`,
          { ...session, lastActivity: new Date().toISOString() },
          SESSION_TTL_SECONDS * 1000,
        );

        const { lastActivity, ...authSession } = session;
        return authSession;
      } catch {
        this.onRedisFailed();
      }
    }

    // Fallback to in-memory
    return this.getSessionFromMemory(token);
  }

  async updateSession(
    token: string,
    updates: Partial<AuthSession>,
  ): Promise<void> {
    if (this.redisAvailable) {
      try {
        const session = await this.redisService.get<SessionData>(
          `${SESSION_KEY_PREFIX}${token}`,
        );
        if (session) {
          await this.redisService.set(
            `${SESSION_KEY_PREFIX}${token}`,
            { ...session, ...updates, lastActivity: new Date().toISOString() },
            SESSION_TTL_SECONDS * 1000,
          );
          return;
        }
      } catch {
        this.onRedisFailed();
      }
    }

    // Fallback
    const memSession = this.fallbackSessions.get(token);
    if (memSession) {
      this.fallbackSessions.set(token, {
        ...memSession,
        ...updates,
        lastActivity: new Date().toISOString(),
        lastActivityDate: new Date(),
      });
    }
  }

  async removeSession(token: string): Promise<void> {
    if (this.redisAvailable) {
      try {
        await this.redisService.del(`${SESSION_KEY_PREFIX}${token}`);
      } catch {
        this.onRedisFailed();
      }
    }

    // Always remove from memory fallback as well
    this.fallbackSessions.delete(token);
  }

  async removeUserSessions(userId: string): Promise<void> {
    // Remove from in-memory fallback
    for (const [token, session] of this.fallbackSessions.entries()) {
      if (session.user.id === userId) {
        this.fallbackSessions.delete(token);
      }
    }

    // For Redis, we'd need SCAN — not practical with cache-manager.
    // This is acceptable since Redis TTL handles expiration.
  }

  async removeMerchantSessions(merchantId: string): Promise<void> {
    // Remove from in-memory fallback
    for (const [token, session] of this.fallbackSessions.entries()) {
      if (session.merchantId === merchantId) {
        this.fallbackSessions.delete(token);
      }
    }
  }

  async extendSession(token: string): Promise<void> {
    if (this.redisAvailable) {
      try {
        const session = await this.redisService.get<SessionData>(
          `${SESSION_KEY_PREFIX}${token}`,
        );
        if (session) {
          await this.redisService.set(
            `${SESSION_KEY_PREFIX}${token}`,
            { ...session, lastActivity: new Date().toISOString() },
            SESSION_TTL_SECONDS * 1000,
          );
          return;
        }
      } catch {
        this.onRedisFailed();
      }
    }

    // Fallback
    const memSession = this.fallbackSessions.get(token);
    if (memSession) {
      memSession.lastActivityDate = new Date();
      memSession.lastActivity = new Date().toISOString();
    }
  }

  getActiveSessions(merchantId?: string): number {
    // Returns count only — no longer exposes full session map
    if (merchantId) {
      let count = 0;
      for (const session of this.fallbackSessions.values()) {
        if (session.merchantId === merchantId) {
          count++;
        }
      }
      return count;
    }
    return this.fallbackSessions.size;
  }

  // --- Internal helpers ---

  private getSessionFromMemory(token: string): AuthSession | null {
    const session = this.fallbackSessions.get(token);
    if (!session) return null;

    const now = new Date();
    const timeSinceLastActivity =
      now.getTime() - session.lastActivityDate.getTime();

    if (timeSinceLastActivity > SESSION_TTL_MS) {
      this.fallbackSessions.delete(token);
      return null;
    }

    if (new Date(session.expiresAt) < now) {
      this.fallbackSessions.delete(token);
      return null;
    }

    session.lastActivityDate = now;
    session.lastActivity = now.toISOString();

    const { lastActivity, lastActivityDate, ...authSession } = session;
    return authSession;
  }

  private enforceMemoryLimits(userId: string): void {
    // Global limit
    if (this.fallbackSessions.size >= MAX_SESSIONS) {
      const sorted = Array.from(this.fallbackSessions.entries()).sort(
        ([, a], [, b]) =>
          a.lastActivityDate.getTime() - b.lastActivityDate.getTime(),
      );
      const toRemove = Math.max(1, Math.floor(MAX_SESSIONS * 0.1));
      for (let i = 0; i < toRemove; i++) {
        this.fallbackSessions.delete(sorted[i][0]);
      }
      this.logger.warn(
        `Session limit reached. Removed ${toRemove} oldest sessions.`,
      );
    }

    // Per-user limit (10)
    const maxPerUser = parseInt(process.env.MAX_SESSIONS_PER_USER || "10");
    const userSessions = Array.from(this.fallbackSessions.entries())
      .filter(([, s]) => s.user.id === userId)
      .sort(
        ([, a], [, b]) =>
          a.lastActivityDate.getTime() - b.lastActivityDate.getTime(),
      );

    if (userSessions.length >= maxPerUser && userSessions.length > 0) {
      this.fallbackSessions.delete(userSessions[0][0]);
      this.logger.warn(
        `User ${userId} session limit reached. Removed oldest session.`,
      );
    }
  }

  private onRedisFailed(): void {
    if (this.redisAvailable) {
      this.redisAvailable = false;
      this.logger.warn(
        "Session storage degraded: using in-memory fallback (auth_storage_mode=memory)",
      );
    } else {
      const now = Date.now();
      if (now - this.lastRedisErrorLog > REDIS_LOG_THROTTLE_MS) {
        this.lastRedisErrorLog = now;
        this.logger.warn("Redis still unavailable for session storage");
      }
    }
  }

  private startHealthCheck(): void {
    this.healthCheckIntervalId = setInterval(async () => {
      if (!this.redisAvailable) {
        try {
          // Try a simple get to check Redis availability
          await this.redisService.get("session:health-check");
          this.redisAvailable = true;
          this.logger.warn(
            "Session storage recovered: Redis reconnected (auth_storage_mode=redis)",
          );
        } catch {
          // Still down, handled by throttled logging in onRedisFailed
        }
      }
    }, REDIS_HEALTH_CHECK_INTERVAL_MS);
  }

  startCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredFallbackSessions();
    }, CLEANUP_INTERVAL_MS);

    this.logger.log(
      `Session cleanup interval started (every ${CLEANUP_INTERVAL_MS / 60000} minutes)`,
    );
  }

  private cleanupExpiredFallbackSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [token, session] of this.fallbackSessions.entries()) {
      if (
        new Date(session.expiresAt) < now ||
        now.getTime() - session.lastActivityDate.getTime() > SESSION_TTL_MS
      ) {
        this.fallbackSessions.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(
        `Cleaned up ${cleanedCount} expired fallback sessions. Active: ${this.fallbackSessions.size}`,
      );
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
    this.fallbackSessions.clear();
    this.logger.log("Session service destroyed");
  }
}
