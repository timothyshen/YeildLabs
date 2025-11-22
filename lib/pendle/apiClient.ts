/**
 * Pendle API Client
 * 
 * HTTP client for interacting with Pendle API
 * Handles requests, caching, and error handling
 */

import { PENDLE_API_BASE, CACHE_DURATION } from './config';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

interface FetchOptions {
  cacheKey?: string;
  cacheDuration?: number;
  params?: Record<string, string | number>;
}

/**
 * Fetch data from Pendle API with caching
 */
export async function fetchFromPendleAPI<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { cacheKey, cacheDuration = CACHE_DURATION.MARKETS, params } = options;

  // Check cache
  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      console.log(`✅ Using cached data for: ${cacheKey}`);
      return cached.data as T;
    }
  }

  // Build URL
  const url = new URL(`${PENDLE_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  console.log(`📡 Fetching from Pendle API: ${url.toString()}`);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Pendle API error (${response.status}): ${errorText || response.statusText}`
      );
    }

    const data = await response.json();

    // Cache the response
    if (cacheKey) {
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
    }

    return data as T;
  } catch (error) {
    console.error('❌ Pendle API fetch error:', error);
    throw error;
  }
}

/**
 * Clear cache for a specific key or all cache
 */
export function clearCache(cacheKey?: string): void {
  if (cacheKey) {
    cache.delete(cacheKey);
  } else {
    cache.clear();
  }
}

/**
 * Fetch markets from Pendle API
 */
export async function fetchMarkets(chainId: number = 8453) {
  const cacheKey = `markets-${chainId}`;
  return fetchFromPendleAPI(PENDLE_ENDPOINTS.MARKETS, {
    cacheKey,
    cacheDuration: CACHE_DURATION.MARKETS,
    params: { chainId },
  });
}

/**
 * Fetch pools from Pendle API
 */
export async function fetchPools(
  chainId: number = 8453,
  marketAddress?: string
) {
  const params: Record<string, string | number> = { chainId };
  if (marketAddress) {
    params.market = marketAddress;
  }

  const cacheKey = `pools-${chainId}-${marketAddress || 'all'}`;
  return fetchFromPendleAPI(PENDLE_ENDPOINTS.POOLS, {
    cacheKey,
    cacheDuration: CACHE_DURATION.POOLS,
    params,
  });
}

/**
 * Fetch token information
 */
export async function fetchTokenInfo(
  tokenAddress: string,
  chainId: number = 8453
) {
  const cacheKey = `token-${tokenAddress}-${chainId}`;
  return fetchFromPendleAPI(PENDLE_ENDPOINTS.TOKENS, {
    cacheKey,
    cacheDuration: CACHE_DURATION.MARKETS,
    params: {
      address: tokenAddress,
      chainId,
    },
  });
}

// Re-export endpoint constant for use in other files
import { PENDLE_ENDPOINTS } from './config';
export { PENDLE_ENDPOINTS };

