import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { apiClient } from '../api-client';

export interface RealtimeConfig {
  url: string;
  anonKey: string;
  token: string;
}

class SupabaseRealtimeService {
  private client: SupabaseClient | null = null;
  private channels: Map<string, RealtimeChannel> = new Map();
  private realtimeConfig: RealtimeConfig | null = null;

  /**
   * Initialize the Supabase client with custom JWT from our backend
   */
  async initialize(): Promise<boolean> {
    try {
      // Get realtime token from our backend
      // Note: apiClient.post returns the data directly, not a response object
      const data = await apiClient.post<RealtimeConfig>('/merchant/notifications/realtime-token');
      
      console.log('[Supabase] Data from realtime-token:', data);
      
      // Check if data is valid
      if (!data) {
        console.error('[Supabase] Invalid response from realtime-token endpoint');
        return false;
      }
      
      this.realtimeConfig = data;
      console.log('[Supabase] Config received:', this.realtimeConfig);

      if (!this.realtimeConfig.url || !this.realtimeConfig.anonKey) {
        console.error('[Supabase] Missing configuration. Please ensure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_KEY are set in the API .env file');
        return false;
      }

      // Create Supabase client with custom JWT
      this.client = createClient(
        this.realtimeConfig.url,
        this.realtimeConfig.anonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            // Use our custom JWT for auth
            storageKey: 'heya-pos-supabase-auth',
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        }
      );

      // Set the custom JWT
      await this.client.auth.setSession({
        access_token: this.realtimeConfig.token,
        refresh_token: '', // We don't use refresh tokens
      });

      console.log('[Supabase] Client initialized');
      return true;
    } catch (error: any) {
      if (error.response?.status === 503) {
        console.warn('[Supabase] Realtime service not configured on backend. Please add SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_KEY to /apps/api/.env file');
      } else {
        console.error('[Supabase] Failed to initialize:', error);
      }
      return false;
    }
  }

  /**
   * Subscribe to merchant notifications
   */
  subscribeToNotifications(
    merchantId: string,
    onNotification: (payload: any) => void,
    onError?: (error: any) => void,
  ): RealtimeChannel | null {
    if (!this.client) {
      console.error('[Supabase] Client not initialized');
      return null;
    }

    // Clean up existing channel if any
    this.unsubscribeFromNotifications(merchantId);

    try {
      // Create channel for this merchant
      const channelName = `merchant:${merchantId}:notifications`;
      const channel = this.client
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'MerchantNotification',
            filter: `merchantId=eq.${merchantId}`,
          },
          (payload) => {
            console.log('[Supabase] New notification:', payload);
            onNotification(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'MerchantNotification',
          },
          (payload) => {
            console.log('[Supabase] Any change on MerchantNotification:', payload);
          }
        )
        .subscribe((status) => {
          console.log('[Supabase] Channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[Supabase] Successfully subscribed to notifications');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[Supabase] Channel error');
            if (onError) {
              onError(new Error('Channel subscription failed'));
            }
          }
        });

      this.channels.set(merchantId, channel);
      return channel;
    } catch (error) {
      console.error('[Supabase] Failed to subscribe:', error);
      if (onError) {
        onError(error);
      }
      return null;
    }
  }

  /**
   * Unsubscribe from merchant notifications
   */
  unsubscribeFromNotifications(merchantId: string): void {
    const channel = this.channels.get(merchantId);
    if (channel) {
      this.client?.removeChannel(channel);
      this.channels.delete(merchantId);
      console.log('[Supabase] Unsubscribed from notifications');
    }
  }

  /**
   * Clean up all subscriptions and disconnect
   */
  disconnect(): void {
    // Remove all channels
    for (const [merchantId, channel] of this.channels) {
      this.client?.removeChannel(channel);
    }
    this.channels.clear();

    // Clear auth session
    if (this.client) {
      this.client.auth.signOut();
    }

    this.client = null;
    this.realtimeConfig = null;
    console.log('[Supabase] Disconnected');
  }

  /**
   * Check if client is initialized and connected
   */
  isConnected(): boolean {
    return this.client !== null;
  }

  /**
   * Get connection status for a specific merchant
   */
  getChannelStatus(merchantId: string): string {
    const channel = this.channels.get(merchantId);
    if (!channel) {
      return 'not_subscribed';
    }
    // Note: Actual status tracking would need to be implemented
    return 'subscribed';
  }

  /**
   * Refresh the auth token (call when our JWT expires)
   */
  async refreshToken(): Promise<boolean> {
    try {
      // Get new token from our backend
      const data = await apiClient.post<RealtimeConfig>('/merchant/notifications/realtime-token');
      this.realtimeConfig = data;

      if (this.client && this.realtimeConfig.token) {
        // Update the session with new token
        await this.client.auth.setSession({
          access_token: this.realtimeConfig.token,
          refresh_token: '',
        });
        console.log('[Supabase] Token refreshed');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Supabase] Failed to refresh token:', error);
      return false;
    }
  }
}

// Singleton instance
export const supabaseRealtime = new SupabaseRealtimeService();