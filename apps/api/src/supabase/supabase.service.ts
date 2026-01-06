import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient | null = null;
  private readonly supabaseUrl: string;
  private readonly supabaseServiceKey: string | undefined;
  private readonly supabaseAnonKey: string | undefined;
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>("SUPABASE_URL") || "";
    this.supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );
    this.supabaseAnonKey = this.configService.get<string>("SUPABASE_ANON_KEY");
    // For Supabase JWT, we need to use the Supabase JWT secret which is derived from the service key
    // In production, you should get this from Supabase dashboard
    this.jwtSecret =
      this.configService.get<string>("SUPABASE_JWT_SECRET") ||
      this.configService.get<string>("JWT_SECRET") ||
      "";

    if (this.supabaseUrl && this.supabaseServiceKey) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this.logger.log("Supabase client initialized");
    } else {
      this.logger.warn(
        "Supabase configuration missing. Realtime features will be disabled.",
      );
    }
  }

  /**
   * For Supabase Realtime, we need to return the anon key
   * The service role key should only be used server-side
   */
  async generateRealtimeToken(
    merchantId: string,
    userId: string,
  ): Promise<string | null> {
    if (!this.supabaseAnonKey) {
      this.logger.error(
        "Cannot generate realtime token: SUPABASE_ANON_KEY not configured",
      );
      return null;
    }

    try {
      // Return the anon key for client-side usage
      // This is safe because RLS policies protect the data
      this.logger.log(
        `Providing anon key for merchant: ${merchantId}, user: ${userId}`,
      );
      return this.supabaseAnonKey;
    } catch (error) {
      this.logger.error("Failed to generate realtime token:", error);
      return null;
    }
  }

  /**
   * Check if Supabase is configured and available
   */
  isConfigured(): boolean {
    return this.supabase !== null;
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient | null {
    return this.supabase;
  }

  /**
   * Get the Supabase URL for client-side connections
   */
  getSupabaseUrl(): string {
    return this.supabaseUrl;
  }

  /**
   * Get the anon key for client-side connections
   * Note: This should be the anon key, not the service key
   */
  getSupabaseAnonKey(): string | null {
    // For now, return null since we don't have the anon key configured
    // In production, this should return the SUPABASE_ANON_KEY
    return this.configService.get<string>("SUPABASE_ANON_KEY") || null;
  }
}
