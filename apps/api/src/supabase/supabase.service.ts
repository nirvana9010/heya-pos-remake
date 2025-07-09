import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sign } from 'jsonwebtoken';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient | null = null;
  private readonly supabaseUrl: string;
  private readonly supabaseServiceKey: string | undefined;
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    this.supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || '';

    if (this.supabaseUrl && this.supabaseServiceKey) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this.logger.log('Supabase client initialized');
    } else {
      this.logger.warn('Supabase configuration missing. Realtime features will be disabled.');
    }
  }

  /**
   * Generate a custom JWT for Supabase Realtime that includes merchantId
   * This allows us to use RLS policies based on merchantId
   */
  async generateRealtimeToken(merchantId: string, userId: string): Promise<string | null> {
    if (!this.supabaseServiceKey) {
      this.logger.error('Cannot generate realtime token: SUPABASE_SERVICE_KEY not configured');
      return null;
    }

    try {
      // Create a custom JWT that Supabase will accept
      // Include merchantId in the JWT claims for RLS policies
      const payload = {
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
        sub: userId,
        merchantId: merchantId,
        role: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
        iss: 'supabase',
      };

      // Sign with the Supabase JWT secret (derived from service key)
      // Note: In production, you should use the actual Supabase JWT secret
      const token = sign(payload, this.jwtSecret);
      
      return token;
    } catch (error) {
      this.logger.error('Failed to generate realtime token:', error);
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
    return this.configService.get<string>('SUPABASE_ANON_KEY') || null;
  }
}