import { useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { useMerchant } from '@/contexts/merchant-context';

export function useApiClient() {
  const { merchantSubdomain } = useMerchant();

  useEffect(() => {
    if (merchantSubdomain) {
      apiClient.setMerchantSubdomain(merchantSubdomain);
    }
  }, [merchantSubdomain]);

  return apiClient;
}