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
 * Uses /v1/{chainId}/markets/active which returns active markets for a specific chain
 * Response structure: { markets: MarketInfo[] }
 */
export async function fetchMarkets(chainId: number = 8453) {
  const cacheKey = `markets-${chainId}`;
  
  // Build endpoint with chainId in path
  const endpoint = PENDLE_ENDPOINTS.MARKETS_ACTIVE.replace('{chainId}', String(chainId));
  
  // Fetch markets for the specific chain
  const response = await fetchFromPendleAPI<{ markets: any[] }>(endpoint, {
    cacheKey,
    cacheDuration: CACHE_DURATION.MARKETS,
  });
  
  // Extract markets array from response
  const markets = response?.markets || (Array.isArray(response) ? response : []);
  
  console.log(`✅ Fetched ${markets.length} active markets for chain ${chainId}`);
  return markets;
}

/**
 * Fetch pools from Pendle API
 * Note: Pendle API may not have a separate pools endpoint
 * Pool data might be included in markets response
 */
export async function fetchPools(
  chainId: number = 8453,
  marketAddress?: string
) {
  // Try to get pool data from markets or specific market endpoint
  if (marketAddress) {
    const cacheKey = `pool-${chainId}-${marketAddress}`;
    try {
      // Try market data endpoint
      const endpoint = `/v2/${chainId}/markets/${marketAddress}/data`;
      return await fetchFromPendleAPI(endpoint, {
        cacheKey,
        cacheDuration: CACHE_DURATION.POOLS,
      });
    } catch (error) {
      console.warn('Could not fetch specific pool data:', error);
    }
  }
  
  // If no specific market, return null (pools might be in markets response)
  return null;
}

/**
 * Fetch token information
 * Note: Token info might be available from /v1/assets/all
 */
export async function fetchTokenInfo(
  tokenAddress: string,
  chainId: number = 8453
) {
  const cacheKey = `token-${tokenAddress}-${chainId}`;
  // Try to get from assets endpoint
  const assets = await fetchFromPendleAPI(PENDLE_ENDPOINTS.ASSETS_ALL, {
    cacheKey: 'assets-all',
    cacheDuration: CACHE_DURATION.MARKETS,
  });
  
  // Find token in assets array
  if (Array.isArray(assets)) {
    const token = assets.find((asset: any) => 
      asset.address?.toLowerCase() === tokenAddress.toLowerCase() &&
      asset.chainId === chainId
    );
    return token || null;
  }
  
  return null;
}

// Re-export endpoint constant for use in other files
import { PENDLE_ENDPOINTS } from './config';
export { PENDLE_ENDPOINTS };

