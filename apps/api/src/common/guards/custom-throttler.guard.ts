import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Custom throttler guard that uses x-forwarded-for for IP resolution
 * behind Fly.io's reverse proxy.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Behind Fly.io proxy, req.ips contains the chain of IPs.
    // The first entry is the original client IP.
    // Falls back to req.ip if no forwarded IPs.
    return req.ips?.length ? req.ips[0] : req.ip;
  }
}
