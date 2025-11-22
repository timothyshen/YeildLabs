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
// Note: Actual endpoints need to be discovered from API docs
// Common patterns to try:
// - /v1/markets
// - /core/v1/markets  
// - /api/v1/markets
// - /markets
export const PENDLE_ENDPOINTS = {
  // These will be updated once we confirm the correct paths
  MARKETS: '/v1/markets', // Try different variations
  POOLS: '/v1/pools',
  TOKENS: '/v1/tokens',
  // Add more endpoints as we discover them
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

