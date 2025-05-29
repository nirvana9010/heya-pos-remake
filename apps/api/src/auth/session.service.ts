import { Injectable } from '@nestjs/common';
import { AuthSession } from '@heya-pos/types';

interface SessionData extends AuthSession {
  lastActivity: Date;
}

@Injectable()
export class SessionService {
  private sessions: Map<string, SessionData> = new Map();
  private readonly SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_HOURS || '12') * 60 * 60 * 1000; // 12 hours default

  createSession(token: string, session: AuthSession): void {
    this.sessions.set(token, {
      ...session,
      lastActivity: new Date(),
    });
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
    if (session.expiresAt < now) {
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

  getActiveSessions(merchantId: string): number {
    let count = 0;
    const now = new Date();
    
    for (const session of this.sessions.values()) {
      if (
        session.merchantId === merchantId &&
        session.expiresAt > now &&
        (now.getTime() - session.lastActivity.getTime()) <= this.SESSION_TIMEOUT
      ) {
        count++;
      }
    }
    
    return count;
  }

  cleanupExpiredSessions(): void {
    const now = new Date();
    
    for (const [token, session] of this.sessions.entries()) {
      if (
        session.expiresAt < now ||
        (now.getTime() - session.lastActivity.getTime()) > this.SESSION_TIMEOUT
      ) {
        this.sessions.delete(token);
      }
    }
  }

  // Run cleanup every hour (since sessions last 12 hours)
  startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000); // 1 hour
  }
}