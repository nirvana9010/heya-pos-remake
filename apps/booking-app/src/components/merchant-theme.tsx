'use client';

import { useEffect } from 'react';
import { useMerchant } from '@/contexts/merchant-context';

const merchantThemes = {
  hamilton: {
    primary: '333 100% 64%', // Pink
    secondary: '271 91% 65%', // Purple
    accent: '322 100% 57%', // Rose
  },
  'zen-wellness': {
    primary: '142 71% 45%', // Green
    secondary: '174 72% 56%', // Teal
    accent: '142 76% 36%', // Dark Green
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
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--accent', theme.accent);
    
    // Update meta theme color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', merchantSubdomain === 'zen-wellness' ? '#22c55e' : '#ff80b5');
    }
  }, [merchantSubdomain]);
  
  return <>{children}</>;
}