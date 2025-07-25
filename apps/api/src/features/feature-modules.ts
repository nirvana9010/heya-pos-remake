export interface FeatureModule {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: 'core' | 'operations' | 'analytics' | 'engagement';
  dependencies: string[];
  optionalDependencies?: string[];
  routes: string[];
  permissions?: string[];
  settings?: {
    key: string;
    type: 'boolean' | 'number' | 'string';
    default: any;
  }[];
}

export const FEATURE_MODULES: Record<string, FeatureModule> = {
  customers: {
    id: 'customers',
    name: 'Customer Management',
    description: 'Manage customer profiles and information',
    category: 'core',
    dependencies: [],
    routes: ['/customers'],
  },

  staff: {
    id: 'staff',
    name: 'Staff Management',
    description: 'Manage staff members and permissions',
    category: 'core',
    dependencies: [],
    routes: ['/staff'],
  },

  services: {
    id: 'services',
    name: 'Service Catalog',
    description: 'Manage services and pricing',
    category: 'core',
    dependencies: [],
    routes: ['/services'],
  },

  bookings: {
    id: 'bookings',
    name: 'Booking System',
    description: 'Full booking and appointment management',
    category: 'operations',
    dependencies: ['customers', 'services'],
    optionalDependencies: ['staff'],
    routes: ['/bookings', '/calendar'],
  },

  check_in_only: {
    id: 'check_in_only',
    name: 'Check-In Kiosk',
    description: 'Simple check-in for loyalty tracking',
    category: 'operations',
    dependencies: ['customers'],
    routes: ['/check-in'],
    settings: [
      {
        key: 'auto_complete_checkins',
        type: 'boolean',
        default: true,
      },
      {
        key: 'show_loyalty_on_checkin',
        type: 'boolean',
        default: true,
      },
    ],
  },

  payments: {
    id: 'payments',
    name: 'Payment Processing',
    description: 'Process payments and manage transactions',
    category: 'operations',
    dependencies: ['customers'],
    optionalDependencies: ['bookings', 'services'],
    routes: ['/payments'],
  },

  roster: {
    id: 'roster',
    name: 'Staff Roster',
    description: 'Manage staff schedules',
    category: 'operations',
    dependencies: ['staff'],
    routes: ['/roster'],
  },

  loyalty: {
    id: 'loyalty',
    name: 'Loyalty Program',
    description: 'Customer loyalty and rewards',
    category: 'engagement',
    dependencies: ['customers'],
    optionalDependencies: ['payments', 'bookings'],
    routes: ['/loyalty'],
  },

  reports: {
    id: 'reports',
    name: 'Analytics & Reports',
    description: 'Business insights and reporting',
    category: 'analytics',
    dependencies: ['customers'],
    optionalDependencies: ['bookings', 'payments', 'services', 'staff'],
    routes: ['/reports'],
  },

  notifications: {
    id: 'notifications',
    name: 'Notifications',
    description: 'SMS and email notifications',
    category: 'engagement',
    dependencies: ['customers'],
    optionalDependencies: ['bookings'],
    routes: ['/notifications'],
  },
};

// Package templates with feature configurations
export const PACKAGE_TEMPLATES = {
  check_in_lite: {
    name: 'Check-In Lite',
    description: 'Simple check-in and loyalty tracking',
    monthlyPrice: 19,
    features: {
      enabled: ['customers', 'loyalty', 'check_in_only', 'reports'],
      config: {
        check_in_only: {
          auto_complete_checkins: true,
          show_loyalty_on_checkin: true,
        },
        reports: {
          sections: ['customers', 'loyalty', 'checkins'],
        },
      },
    },
    limits: {
      maxStaff: 0,
      maxServices: 0,
      maxLocations: 1,
      maxCustomers: 5000,
    },
  },

  starter: {
    name: 'Starter',
    description: 'Essential booking and payment features',
    monthlyPrice: 49,
    features: {
      enabled: ['customers', 'services', 'bookings', 'payments', 'reports'],
      config: {},
    },
    limits: {
      maxStaff: 5,
      maxServices: 50,
      maxLocations: 1,
      maxCustomers: 1000,
    },
  },

  professional: {
    name: 'Professional',
    description: 'Full-featured salon management',
    monthlyPrice: 99,
    features: {
      enabled: [
        'customers',
        'staff',
        'services',
        'bookings',
        'payments',
        'roster',
        'loyalty',
        'reports',
        'notifications',
      ],
      config: {},
    },
    limits: {
      maxStaff: 15,
      maxServices: 200,
      maxLocations: 3,
      maxCustomers: 5000,
    },
  },

  enterprise: {
    name: 'Enterprise',
    description: 'Unlimited features for growing businesses',
    monthlyPrice: 199,
    features: {
      enabled: Object.keys(FEATURE_MODULES), // All features
      config: {},
    },
    limits: {
      maxStaff: -1, // Unlimited
      maxServices: -1,
      maxLocations: -1,
      maxCustomers: -1,
    },
  },
};

// Feature dependency validation
export function validateFeatureDependencies(enabledFeatures: string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const enabledSet = new Set(enabledFeatures);

  for (const featureId of enabledFeatures) {
    const module = FEATURE_MODULES[featureId];
    if (!module) {
      errors.push(`Unknown feature: ${featureId}`);
      continue;
    }

    // Check required dependencies
    for (const dep of module.dependencies) {
      if (!enabledSet.has(dep)) {
        errors.push(`Feature '${featureId}' requires '${dep}'`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Get all features that depend on a given feature
export function getDependentFeatures(featureId: string): string[] {
  const dependents: string[] = [];

  for (const [id, module] of Object.entries(FEATURE_MODULES)) {
    if (module.dependencies.includes(featureId)) {
      dependents.push(id);
    }
  }

  return dependents;
}

// Check if a feature can be safely disabled
export function canDisableFeature(
  featureId: string,
  enabledFeatures: string[]
): { canDisable: boolean; reason?: string } {
  const enabledSet = new Set(enabledFeatures);
  const dependents = getDependentFeatures(featureId);

  for (const dependent of dependents) {
    if (enabledSet.has(dependent)) {
      return {
        canDisable: false,
        reason: `Cannot disable '${featureId}' because '${dependent}' depends on it`,
      };
    }
  }

  return { canDisable: true };
}