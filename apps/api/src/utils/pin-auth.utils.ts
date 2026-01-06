export class PinAuthManager {
  private static attempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  static canAttempt(identifier: string): boolean {
    const attemptInfo = this.attempts.get(identifier);
    if (!attemptInfo) return true;

    const now = new Date();
    const timeSinceLastAttempt =
      now.getTime() - attemptInfo.lastAttempt.getTime();

    if (attemptInfo.count >= this.MAX_ATTEMPTS) {
      if (timeSinceLastAttempt < this.LOCKOUT_DURATION) {
        return false;
      }
      this.attempts.delete(identifier);
      return true;
    }

    return true;
  }

  static recordAttempt(identifier: string, success: boolean): void {
    if (success) {
      this.attempts.delete(identifier);
      return;
    }

    const attemptInfo = this.attempts.get(identifier) || {
      count: 0,
      lastAttempt: new Date(),
    };
    attemptInfo.count++;
    attemptInfo.lastAttempt = new Date();
    this.attempts.set(identifier, attemptInfo);
  }

  static getRemainingAttempts(identifier: string): number {
    const attemptInfo = this.attempts.get(identifier);
    if (!attemptInfo) return this.MAX_ATTEMPTS;
    return Math.max(0, this.MAX_ATTEMPTS - attemptInfo.count);
  }
}
