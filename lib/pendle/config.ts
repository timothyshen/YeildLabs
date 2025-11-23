/**
 * Pendle API Configuration
 * 
 * Base configuration for Pendle API integration
 * API Documentation: https://api-v2.pendle.finance/core/docs
 */

export const PENDLE_API_BASE = 'https://api-v2.pendle.finance';

// Chain configuration
export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_NAME = 'base';

// API endpoints
// Based on API documentation at https://api-v2.pendle.finance/core/docs
// Confirmed working endpoints:
export const PENDLE_ENDPOINTS = {
  // ✅ Confirmed working: Returns active markets for a specific chain with full details
  // Format: /core/v1/{chainId}/markets/active
  // Response: { markets: [{ name, address, expiry, pt, yt, sy, underlyingAsset, details: { liquidity, aggregatedApy, ... } }] }
  MARKETS_ACTIVE: '/core/v1/{chainId}/markets/active',
  // ✅ Confirmed working: Returns all markets across all chains
  MARKETS_ALL: '/v1/markets/all',
  // ✅ Confirmed working: Returns all assets/tokens
  ASSETS_ALL: '/v1/assets/all',
  // Market-specific data endpoint
  MARKETS_DATA: '/v2/{chainId}/markets/{address}/data',
  // ✅ Confirmed working: Returns user positions from database
  // Format: /core/v1/dashboard/positions/database/{address}
  // Query params: filterUsd (optional, default 0.1 to filter small positions)
  // Response: [{ chainId, totalOpen, totalClosed, openPositions, closedPositions, syPositions, updatedAt }]
  POSITIONS_DATABASE: '/core/v1/dashboard/positions/database/{address}',
} as const;

// Cache configuration
export const CACHE_DURATION = {
  MARKETS: 5 * 60 * 1000, // 5 minutes
  POOLS: 5 * 60 * 1000, // 5 minutes
  POSITIONS: 1 * 60 * 1000, // 1 minute
} as const;

// Supported stablecoins (from SOT)
export const SUPPORTED_STABLECOINS = [
  'USDC',
  'sUSDe',
  'cUSD',
  'USD0++',
  'fUSD',
  'sKAITO',
] as const;

export type StablecoinSymbol = typeof SUPPORTED_STABLECOINS[number];

/**
 * Check if an asset is a supported stablecoin
 */
export function isSupportedStablecoin(symbol: string): boolean {
  return SUPPORTED_STABLECOINS.includes(symbol as StablecoinSymbol);
}

