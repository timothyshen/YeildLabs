'use client';

import { useState, useEffect } from 'react';
import type { PendlePool } from '@/types';

export function usePendlePools(stablecoinOnly = true) {
  const [pools, setPools] = useState<PendlePool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPools();
  }, [stablecoinOnly]);

  const fetchPools = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pendle/pools?stablecoin=${stablecoinOnly}`);
      const data = await response.json();

      if (data.success) {
        setPools(data.data);
      } else {
        setError(data.error || 'Failed to fetch pools');
      }
    } catch (err) {
      setError('Failed to fetch pools');
      console.error('Error fetching pools:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPools = () => {
    fetchPools();
  };

  return {
    pools,
    isLoading,
    error,
    refreshPools,
  };
}
