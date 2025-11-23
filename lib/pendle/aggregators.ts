/**
 * DEX Aggregator Utilities
 * 
 * Functions for working with DEX aggregators (1inch, KyberSwap, ParaSwap, etc.)
 */

import { DEFAULT_AGGREGATOR, SUPPORTED_AGGREGATORS, type AggregatorName } from './config';

export interface AggregatorInfo {
  name: AggregatorName;
  displayName: string;
  description: string;
  supportedChains: number[];
  website: string;
}

/**
 * Aggregator information
 */
export const AGGREGATOR_INFO: Record<AggregatorName, AggregatorInfo> = {
  '1inch': {
    name: '1inch',
    displayName: '1inch',
    description: '1inch DEX Aggregator - Best rates across multiple DEXs',
    supportedChains: [1, 8453, 42161, 137, 10], // Ethereum, Base, Arbitrum, Polygon, Optimism
    website: 'https://1inch.io',
  },
  kyberswap: {
    name: 'kyberswap',
    displayName: 'KyberSwap',
    description: 'KyberSwap Elastic - Dynamic market maker',
    supportedChains: [1, 8453, 42161, 137, 10],
    website: 'https://kyberswap.com',
  },
  paraswap: {
    name: 'paraswap',
    displayName: 'ParaSwap',
    description: 'ParaSwap - DEX aggregator with gas optimization',
    supportedChains: [1, 8453, 42161, 137, 10],
    website: 'https://paraswap.io',
  },
};

/**
 * Get aggregator info by name
 */
export function getAggregatorInfo(name: AggregatorName): AggregatorInfo {
  return AGGREGATOR_INFO[name];
}

/**
 * Get all supported aggregators for a chain
 */
export function getSupportedAggregatorsForChain(chainId: number): AggregatorName[] {
  return SUPPORTED_AGGREGATORS.filter((agg) =>
    AGGREGATOR_INFO[agg].supportedChains.includes(chainId)
  );
}

/**
 * Get the best aggregator for a chain (defaults to 1inch)
 */
export function getBestAggregatorForChain(chainId: number): AggregatorName {
  const supported = getSupportedAggregatorsForChain(chainId);
  if (supported.length === 0) {
    return DEFAULT_AGGREGATOR;
  }
  // Prefer 1inch if available, otherwise use first available
  return supported.includes('1inch') ? '1inch' : supported[0];
}

/**
 * Format aggregator list for Pendle SDK API
 * Pendle SDK accepts comma-separated list: '1inch,kyberswap'
 */
export function formatAggregatorsForAPI(aggregators: AggregatorName[]): string {
  return aggregators.join(',');
}

/**
 * Parse aggregator string from API
 */
export function parseAggregatorsFromAPI(aggregators: string): AggregatorName[] {
  return aggregators
    .split(',')
    .map((agg) => agg.trim().toLowerCase())
    .filter((agg): agg is AggregatorName =>
      SUPPORTED_AGGREGATORS.includes(agg as AggregatorName)
    );
}

