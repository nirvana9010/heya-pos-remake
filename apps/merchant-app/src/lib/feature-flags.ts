/**
 * Feature flags for gradual rollout of new features
 */

export interface FeatureFlags {
  supabaseRealtime: boolean;
  // Add more feature flags here as needed
}

class FeatureFlagService {
  private flags: FeatureFlags = {
    supabaseRealtime: false, // Default to false - SSE is the primary realtime system
  };

  /**
   * Initialize feature flags from environment or API
   */
  initialize(): void {
    // Check environment variable
    if (typeof window !== 'undefined') {
      const enableSupabase = process.env.NEXT_PUBLIC_ENABLE_SUPABASE_REALTIME;
      if (enableSupabase === 'true') {
        this.flags.supabaseRealtime = true;
      }

      // Check localStorage for override (useful for testing)
      const localOverride = localStorage.getItem('feature_supabaseRealtime');
      if (localOverride !== null) {
        this.flags.supabaseRealtime = localOverride === 'true';
      }
      
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature] || false;
  }

  /**
   * Enable a feature (for testing)
   */
  enable(feature: keyof FeatureFlags): void {
    this.flags[feature] = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`feature_${feature}`, 'true');
    }
  }

  /**
   * Disable a feature (for testing)
   */
  disable(feature: keyof FeatureFlags): void {
    this.flags[feature] = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`feature_${feature}`, 'false');
    }
  }

  /**
   * Get all feature flags
   */
  getAll(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Enable Supabase Realtime for specific merchants (gradual rollout)
   */
  enableForMerchant(merchantId: string): void {
    // List of merchant IDs to enable Supabase for
    const enabledMerchants = [
      // Add merchant IDs here for gradual rollout
      // 'merchant-uuid-1',
      // 'merchant-uuid-2',
    ];

    if (enabledMerchants.includes(merchantId)) {
      this.flags.supabaseRealtime = true;
    }
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagService();

// Initialize on import
if (typeof window !== 'undefined') {
  featureFlags.initialize();
}

// Export hook for React components
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return featureFlags.isEnabled(flag);
}