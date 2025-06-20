'use client';

import { useEffect } from 'react';
import { useMerchant } from '@/contexts/merchant-context';

const merchantThemes = {
  hamilton: {
    primary: '333 100% 64%', // Pink
    primaryForeground: '0 0% 100%', // White text on pink
    secondary: '271 91% 65%', // Purple
    secondaryForeground: '0 0% 100%', // White text on purple
    accent: '322 100% 57%', // Rose
    accentForeground: '0 0% 100%', // White text on rose
  },
  'zen-wellness': {
    primary: '142 71% 45%', // Green
    primaryForeground: '0 0% 100%', // White text on green
    secondary: '174 72% 56%', // Teal
    secondaryForeground: '0 0% 100%', // White text on teal
    accent: '142 76% 36%', // Dark Green
    accentForeground: '0 0% 100%', // White text on dark green
  },
};

export function MerchantTheme({ children }: { children: React.ReactNode }) {
  const { merchantSubdomain } = useMerchant();
  
  useEffect(() => {
    if (!merchantSubdomain) return;
    
    const theme = merchantThemes[merchantSubdomain as keyof typeof merchantThemes];
    if (!theme) return;
    
    // Update CSS variables
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-foreground', theme.primaryForeground);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--secondary-foreground', theme.secondaryForeground);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-foreground', theme.accentForeground);
    
    // Update meta theme color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', merchantSubdomain === 'zen-wellness' ? '#22c55e' : '#ff80b5');
    }
  }, [merchantSubdomain]);
  
  return <>{children}</>;
}