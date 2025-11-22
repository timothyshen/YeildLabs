/**
 * Pendle API Types
 * 
 * Type definitions for Pendle API responses
 * These will be refined as we explore the actual API responses
 */

/**
 * Base market structure from Pendle API
 */
export interface PendleMarket {
  address: string;
  name?: string;
  symbol?: string;
  chainId: number;
  ptAddress?: string;
  ytAddress?: string;
  syAddress?: string;
  underlyingAsset?: string;
  underlyingAssetAddress?: string;
  maturity?: number;
  maturityDate?: string;
  // Additional fields will be added as we discover them
  [key: string]: any;
}

/**
 * Pool data from Pendle API
 */
export interface PendlePoolData {
  address: string;
  market?: string;
  chainId: number;
  tvl?: string;
  volume24h?: string;
  // Additional fields will be added as we discover them
  [key: string]: any;
}

/**
 * Yield/APY data from Pendle API
 */
export interface PendleYieldData {
  apy?: number;
  impliedYield?: number;
  ptPrice?: string;
  ytPrice?: string;
  syPrice?: string;
  // Additional fields will be added as we discover them
  [key: string]: any;
}

/**
 * Token information from Pendle API
 */
export interface PendleTokenInfo {
  address: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  chainId?: number;
  // Additional fields will be added as we discover them
  [key: string]: any;
}

/**
 * Complete market information (market + pool + yield data)
 */
export interface PendleMarketInfo {
  market: PendleMarket;
  pool?: PendlePoolData;
  yield?: PendleYieldData;
  ptToken?: PendleTokenInfo;
  ytToken?: PendleTokenInfo;
  syToken?: PendleTokenInfo;
}

