/**
 * Token Address Resolution Utilities
 *
 * Handles complex token address lookups for Pendle pools
 * Supports both legacy string addresses and unified Token objects
 */

import { normalizeAddress, isValidAddress } from './address';
import type { PendlePool } from '@/types';

export interface ResolvedTokenAddresses {
  underlying: string;
  underlyingSymbol: string;
  pt: string;
  yt: string;
  sy: string;
}

/**
 * Resolve all token addresses from a Pendle pool
 * Handles both legacy and unified data formats
 *
 * @param pool - Pendle pool data
 * @returns Normalized token addresses
 */
export function resolvePoolTokenAddresses(pool: PendlePool): ResolvedTokenAddresses {
  // Get underlying asset info
  const underlyingAsset = pool.underlyingAsset;
  const underlyingAddress = typeof underlyingAsset === 'string'
    ? underlyingAsset
    : (underlyingAsset as any)?.address || '';
  const underlyingSymbol = typeof underlyingAsset === 'string'
    ? underlyingAsset
    : (underlyingAsset as any)?.symbol || 'Unknown';

  // Get PT address - try multiple formats
  const ptTokenAddress =
    (pool as any).ptAddress ||
    (typeof (pool as any).ptToken === 'string'
      ? (pool as any).ptToken
      : (pool as any).ptToken?.address) ||
    '';

  // Get YT address - try multiple formats
  const ytTokenAddress =
    (pool as any).ytAddress ||
    (typeof (pool as any).ytToken === 'string'
      ? (pool as any).ytToken
      : (pool as any).ytToken?.address) ||
    '';

  // Get SY address - try multiple formats
  const syTokenAddress =
    (pool as any).syAddress ||
    (typeof (pool as any).syToken === 'string'
      ? (pool as any).syToken
      : (pool as any).syToken?.address) ||
    '';

  // Normalize all addresses (remove chainId prefix if present)
  return {
    underlying: normalizeAddress(underlyingAddress),
    underlyingSymbol,
    pt: normalizeAddress(ptTokenAddress),
    yt: normalizeAddress(ytTokenAddress),
    sy: normalizeAddress(syTokenAddress),
  };
}

/**
 * Validate that all required token addresses are valid
 *
 * @param addresses - Resolved token addresses
 * @returns Object with validation results for each address
 */
export function validateTokenAddresses(addresses: ResolvedTokenAddresses) {
  return {
    underlying: isValidAddress(addresses.underlying),
    pt: isValidAddress(addresses.pt),
    yt: isValidAddress(addresses.yt),
    sy: isValidAddress(addresses.sy),
    allValid:
      isValidAddress(addresses.underlying) &&
      isValidAddress(addresses.pt) &&
      isValidAddress(addresses.yt) &&
      isValidAddress(addresses.sy),
  };
}

/**
 * Get a human-readable summary of token addresses
 * Useful for debugging and logging
 *
 * @param pool - Pendle pool
 * @returns Summary object with truncated addresses
 */
export function getTokenAddressSummary(pool: PendlePool) {
  const addresses = resolvePoolTokenAddresses(pool);
  const validation = validateTokenAddresses(addresses);

  const truncate = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return {
    poolName: pool.name,
    underlying: {
      symbol: addresses.underlyingSymbol,
      address: truncate(addresses.underlying),
      valid: validation.underlying,
    },
    pt: {
      address: truncate(addresses.pt),
      valid: validation.pt,
    },
    yt: {
      address: truncate(addresses.yt),
      valid: validation.yt,
    },
    sy: {
      address: truncate(addresses.sy),
      valid: validation.sy,
    },
    allValid: validation.allValid,
  };
}
