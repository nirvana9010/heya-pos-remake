'use client';

import { useMerchant } from '@/contexts/merchant-context';
import { Sparkles, Leaf } from 'lucide-react';

export function MerchantIndicator() {
  const { merchant, merchantSubdomain } = useMerchant();
  
  if (!merchant || process.env.NODE_ENV !== 'development') return null;
  
  const isZen = merchantSubdomain === 'zen-wellness';
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-background/95 backdrop-blur border rounded-full px-4 py-2 shadow-lg">
      <div className={`flex items-center gap-2 text-sm font-medium ${isZen ? 'text-green-600' : 'text-pink-600'}`}>
        {isZen ? <Leaf className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        <span>{merchant.name}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        ({merchantSubdomain})
      </div>
    </div>
  );
}