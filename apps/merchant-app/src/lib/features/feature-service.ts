import { apiClient } from '../api-client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import React from 'react';

export interface FeatureModule {
  id: string;
  name: string;
  description: string;
  category: string;
  dependencies: string[];
  routes: string[];
  settings?: Array<{
    key: string;
    type: string;
    default: any;
  }>;
}

export interface MerchantFeatures {
  enabled: string[];
  disabled: string[];
  overrides: Record<string, any>;
  packageFeatures: string[];
  packageName: string;
}

interface FeatureStore {
  features: MerchantFeatures | null;
  modules: FeatureModule[] | null;
  loading: boolean;
  error: string | null;
  lastFetched: number;
  loadFeatures: () => Promise<void>;
  hasFeature: (featureId: string) => boolean;
  getFeatureSetting: (featureId: string, key: string) => any;
  canAccessRoute: (route: string) => boolean;
  reset: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useFeatureStore = create<FeatureStore>()(
  persist(
    (set, get) => ({
      features: null,
      modules: null,
      loading: false,
      error: null,
      lastFetched: 0,

      loadFeatures: async () => {
        const state = get();
        const now = Date.now();

        // Use cache if fresh
        if (state.features && state.lastFetched && (now - state.lastFetched) < CACHE_DURATION) {
          return;
        }

        set({ loading: true, error: null });

        try {
          const [features, modules] = await Promise.all([
            apiClient.features.getFeatures(),
            apiClient.features.getFeatureModules()
          ]);

          console.log('[FeatureStore] Features API response:', features);
          console.log('[FeatureStore] Modules API response:', modules);

          set({
            features,
            modules,
            loading: false,
            lastFetched: now
          });
        } catch (error: any) {
          console.error('[FeatureStore] Error loading features:', error);
          set({
            error: error.message || 'Failed to load features',
            loading: false
          });
        }
      },

      hasFeature: (featureId: string) => {
        const { features } = get();
        if (!features) return false;
        
        return features.enabled.includes(featureId) && 
               !features.disabled.includes(featureId);
      },

      getFeatureSetting: (featureId: string, key: string) => {
        const { features } = get();
        if (!features) return null;

        // Check overrides first
        const overrideKey = `${featureId}.${key}`;
        if (features.overrides[overrideKey] !== undefined) {
          return features.overrides[overrideKey];
        }

        // Return default from module definition
        const { modules } = get();
        const featureModule = modules?.find((m) => m.id === featureId);
        const setting = featureModule?.settings?.find((s) => s.key === key);
        return setting?.default;
      },

      canAccessRoute: (route: string) => {
        const { features, modules } = get();
        if (!features || !modules) return true; // Allow access if not loaded

        // Find modules that own this route
        const routeModules = modules.filter(m => 
          m.routes.some(r => route.startsWith(r))
        );

        // If no modules own this route, it's always accessible
        if (routeModules.length === 0) return true;

        // Check if any owning module is enabled
        return routeModules.some(m => get().hasFeature(m.id));
      },

      reset: () => {
        set({
          features: null,
          modules: null,
          loading: false,
          error: null,
          lastFetched: 0
        });
      }
    }),
    {
      name: 'merchant-features'
    }
  )
);

// Hook to use features
export function useFeatures() {
  const store = useFeatureStore();
  
  // Load features on mount if needed
  React.useEffect(() => {
    if (!store.features && !store.loading) {
      store.loadFeatures();
    }
  }, [store]);

  return store;
}

// Standalone helpers for non-hook contexts
export const featureService = {
  hasFeature: (featureId: string) => {
    return useFeatureStore.getState().hasFeature(featureId);
  },
  
  canAccessRoute: (route: string) => {
    return useFeatureStore.getState().canAccessRoute(route);
  },
  
  getFeatureSetting: (featureId: string, key: string) => {
    return useFeatureStore.getState().getFeatureSetting(featureId, key);
  },
  
  loadFeatures: () => {
    return useFeatureStore.getState().loadFeatures();
  }
};
