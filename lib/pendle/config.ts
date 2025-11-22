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
  // ✅ Confirmed: Returns active markets for a specific chain
  // Format: /v1/{chainId}/markets/active
  MARKETS_ACTIVE: '/v1/{chainId}/markets/active',
  // ✅ Confirmed working: Returns all markets across all chains
  MARKETS_ALL: '/v1/markets/all',
  // ✅ Confirmed working: Returns all assets/tokens
  ASSETS_ALL: '/v1/assets/all',
  // Market-specific data endpoint
  MARKETS_DATA: '/v2/{chainId}/markets/{address}/data',
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

