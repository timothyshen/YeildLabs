/**
 * Hook to get token address from local constants by symbol
 */

import { useMemo } from 'react';
import { getTokenAddressBySymbol } from '@/lib/utils/tokenAddress';

export interface UseTokenAddressOptions {
  symbol?: string;
  chainId?: number;
  enabled?: boolean;
}

export function useTokenAddress({
  symbol,
  chainId = 8453,
  enabled = true,
}: UseTokenAddressOptions) {
  const { address, isLoading, error } = useMemo(() => {
    if (!enabled || !symbol) {
      return { address: null, isLoading: false, error: null };
    }

    try {
      const tokenAddress = getTokenAddressBySymbol(symbol, chainId);
      return {
        address: tokenAddress,
        isLoading: false,
        error: null,
      };
    } catch (err) {
      return {
        address: null,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to get token address'),
      };
    }
  }, [symbol, chainId, enabled]);

  return { address, isLoading, error };
}

