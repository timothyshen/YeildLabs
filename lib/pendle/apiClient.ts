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

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Pendle API error:`, {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        error: errorText,
      });
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
 * Uses /core/v1/{chainId}/markets/active which returns active markets with full details
 * Response structure: { markets: MarketInfo[] }
 * Each market includes a 'details' object with liquidity, APY, etc.
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
  
  console.log(`✅ Fetched ${markets.length} active markets for chain ${chainId} with details`);
  return markets;
}

/**
 * Fetch detailed market data for a specific market
 * Uses /v2/{chainId}/markets/{address}/data
 */
export async function fetchMarketDetails(marketAddress: string, chainId: number = 8453) {
  const cacheKey = `market-details-${chainId}-${marketAddress}`;
  const endpoint = PENDLE_ENDPOINTS.MARKETS_DATA
    .replace('{chainId}', String(chainId))
    .replace('{address}', marketAddress);
  
  try {
    const data = await fetchFromPendleAPI(endpoint, {
      cacheKey,
      cacheDuration: CACHE_DURATION.MARKETS,
    });
    return data;
  } catch (error) {
    console.warn(`⚠️ Could not fetch details for market ${marketAddress}:`, error);
    return null;
  }
}

/**
 * Fetch user positions from Pendle database
 * Uses /core/v1/dashboard/positions/database/{address}
 * Response: [{ chainId, totalOpen, totalClosed, openPositions, closedPositions, syPositions, updatedAt }]
 */
export async function fetchUserPositions(
  userAddress: string,
  options?: { filterUsd?: number }
) {
  const cacheKey = `positions-${userAddress}-${options?.filterUsd || '0.1'}`;
  const endpoint = PENDLE_ENDPOINTS.POSITIONS_DATABASE.replace('{address}', userAddress);
  
  // Add filterUsd query parameter (default 0.1 to filter small positions)
  const params: Record<string, string | number> = {};
  if (options?.filterUsd !== undefined) {
    params.filterUsd = options.filterUsd;
  } else {
    params.filterUsd = 0.1; // Default filter
  }
  
  try {
    console.log(`📡 Fetching positions for ${userAddress} with filterUsd=${params.filterUsd}`);
    const data = await fetchFromPendleAPI<any>(endpoint, {
      cacheKey,
      cacheDuration: CACHE_DURATION.POSITIONS,
      params,
    });
    
    // API returns { positions: [...] } or directly [...]
    let result: any[] = [];
    if (data) {
      if (Array.isArray(data)) {
        result = data;
      } else if (data.positions && Array.isArray(data.positions)) {
        result = data.positions;
      } else if (typeof data === 'object' && 'chainId' in data) {
        // Single chain object, wrap in array
        result = [data];
      }
    }
    
    console.log(`✅ Fetched positions data: ${result.length} chains`);
    if (result.length > 0) {
      console.log(`   Chain IDs: ${result.map((r: any) => r.chainId).join(', ')}`);
      result.forEach((chain: any) => {
        console.log(`   Chain ${chain.chainId}: ${chain.totalOpen || 0} open, ${chain.totalClosed || 0} closed`);
      });
    }
    return result;
  } catch (error) {
    console.error(`❌ Could not fetch positions for ${userAddress}:`, error);
    throw error; // Re-throw to let caller handle
  }
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
 * Fetch all assets for a specific chain
 * Uses /core/v1/assets/all?chainId={chainId}
 */
export async function fetchAssetsByChain(chainId: number = 8453) {
  const cacheKey = `assets-${chainId}`;
  const endpoint = PENDLE_ENDPOINTS.ASSETS_BY_CHAIN;
  
  try {
    const response = await fetchFromPendleAPI<any[]>(endpoint, {
      cacheKey,
      cacheDuration: CACHE_DURATION.MARKETS,
      params: { chainId },
    });
    
    // API might return array directly or wrapped in an object
    const assets = Array.isArray(response) ? response : (response?.assets || response?.data || []);
    
    console.log(`✅ Fetched ${assets.length} assets for chain ${chainId}`);
    return assets;
  } catch (error) {
    console.error(`❌ Could not fetch assets for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * Get token address by symbol from Pendle API
 * Fetches assets for the chain and finds matching token by symbol
 */
export async function getTokenAddressBySymbol(
  symbol: string,
  chainId: number = 8453
): Promise<string | null> {
  if (!symbol) return null;
  
  const assets = await fetchAssetsByChain(chainId);
  
  // Normalize symbol for comparison (case-insensitive)
  const normalizedSymbol = symbol.toUpperCase().trim();
  
  // Find matching asset by symbol
  const asset = assets.find((a: any) => {
    const assetSymbol = (a.symbol || a.name || '').toUpperCase().trim();
    return assetSymbol === normalizedSymbol || 
           assetSymbol.includes(normalizedSymbol) ||
           normalizedSymbol.includes(assetSymbol);
  });
  
  if (asset?.address) {
    // Extract address if it's in "chainId-address" format
    const address = asset.address.includes('-') 
      ? asset.address.split('-').pop() || asset.address
      : asset.address;
    
    console.log(`✅ Found token address for ${symbol}: ${address}`);
    return address;
  }
  
  console.warn(`⚠️ Could not find token address for symbol: ${symbol}`);
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

