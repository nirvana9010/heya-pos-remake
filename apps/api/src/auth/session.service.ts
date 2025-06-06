import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { AuthSession } from '@heya-pos/types';

interface SessionData extends AuthSession {
  lastActivity: Date;
}

@Injectable()
export class SessionService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private sessions: Map<string, SessionData> = new Map();
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private readonly SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_HOURS || '24') * 60 * 60 * 1000; // 24 hours default (was 365 days!)
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes instead of 1 hour
  private readonly MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || '10000'); // Limit total sessions
  private readonly MAX_SESSIONS_PER_USER = parseInt(process.env.MAX_SESSIONS_PER_USER || '10'); // Limit per user

  createSession(token: string, session: AuthSession): void {
    // Check if we've hit the global session limit
    if (this.sessions.size >= this.MAX_SESSIONS) {
      // Remove oldest sessions
      const sortedSessions = Array.from(this.sessions.entries())
        .sort(([, a], [, b]) => a.lastActivity.getTime() - b.lastActivity.getTime());
      
      // Remove 10% of oldest sessions
      const toRemove = Math.max(1, Math.floor(this.MAX_SESSIONS * 0.1));
      for (let i = 0; i < toRemove; i++) {
        this.sessions.delete(sortedSessions[i][0]);
      }
      
      this.logger.warn(`Session limit reached. Removed ${toRemove} oldest sessions.`);
    }

    // Check user session limit
    const userSessionCount = Array.from(this.sessions.values())
      .filter(s => s.user.id === session.user.id).length;
    
    if (userSessionCount >= this.MAX_SESSIONS_PER_USER) {
      // Remove oldest session for this user
      const userSessions = Array.from(this.sessions.entries())
        .filter(([, s]) => s.user.id === session.user.id)
        .sort(([, a], [, b]) => a.lastActivity.getTime() - b.lastActivity.getTime());
      
      if (userSessions.length > 0) {
        this.sessions.delete(userSessions[0][0]);
        this.logger.warn(`User ${session.user.id} session limit reached. Removed oldest session.`);
      }
    }

    this.sessions.set(token, {
      ...session,
      lastActivity: new Date(),
    });

    // Log memory status periodically
    if (this.sessions.size % 100 === 0) {
      this.logger.log(`Active sessions: ${this.sessions.size}`);
    }
  }

  getSession(token: string): AuthSession | null {
    const session = this.sessions.get(token);
    
    if (!session) {
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
    
    if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
      this.removeSession(token);
      return null;
    }

    // Check if token has expired
    if (new Date(session.expiresAt) < now) {
      this.removeSession(token);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    
    const { lastActivity, ...authSession } = session;
    return authSession;
  }

  updateSession(token: string, updates: Partial<AuthSession>): void {
    const session = this.sessions.get(token);
    if (session) {
      this.sessions.set(token, {
        ...session,
        ...updates,
        lastActivity: new Date(),
      });
    }
  }

  removeSession(token: string): void {
    this.sessions.delete(token);
  }

  removeUserSessions(userId: string): void {
    for (const [token, session] of this.sessions.entries()) {
      if (session.user.id === userId) {
        this.sessions.delete(token);
      }
    }
  }

  removeMerchantSessions(merchantId: string): void {
    for (const [token, session] of this.sessions.entries()) {
      if (session.merchantId === merchantId) {
        this.sessions.delete(token);
      }
    }
  }

  extendSession(token: string): void {
    const session = this.sessions.get(token);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  getActiveSessions(merchantId?: string): number | Map<string, SessionData> {
    if (merchantId) {
      let count = 0;
      const now = new Date();
      
      for (const session of this.sessions.values()) {
        if (
          session.merchantId === merchantId &&
          new Date(session.expiresAt) > now &&
          now.getTime() - session.lastActivity.getTime() <= this.SESSION_TIMEOUT
        ) {
          count++;
        }
      }
      
      return count;
    } else {
      // Return the entire sessions map when no merchantId is provided
      return this.sessions;
    }
  }

  cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [token, session] of this.sessions.entries()) {
      if (
        new Date(session.expiresAt) < now ||
        now.getTime() - session.lastActivity.getTime() > this.SESSION_TIMEOUT
      ) {
        this.sessions.delete(token);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired sessions. Active sessions: ${this.sessions.size}`);
    }
  }

  startCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);
    
    this.logger.log(`Session cleanup interval started (every ${this.CLEANUP_INTERVAL / 60000} minutes)`);
  }

  onModuleDestroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      this.logger.log('Session cleanup interval stopped');
    }
    
    // Clear all sessions on module destroy
    this.sessions.clear();
  }
}