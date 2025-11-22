/**
 * Asset Matcher
 * 
 * Matches user assets to compatible Pendle pools
 */

import type { WalletAsset } from '@/types';
import type { PendlePool } from '@/types';

/**
 * Match user assets to Pendle pools
 * Returns a map of asset symbol to matching pools
 */
export function findMatchingPools(
  userAssets: WalletAsset[],
  allPools: PendlePool[]
): Map<string, PendlePool[]> {
  const matches = new Map<string, PendlePool[]>();

  userAssets.forEach((asset) => {
    const assetSymbol = asset.symbol?.toUpperCase() || '';
    const assetAddress = asset.token?.toLowerCase() || '';

    if (!assetSymbol && !assetAddress) {
      return; // Skip invalid assets
    }

    const matchingPools: PendlePool[] = [];

    allPools.forEach((pool) => {
      const poolAsset = pool.underlyingAsset?.toUpperCase() || '';

      // Match by symbol (case-insensitive)
      if (assetSymbol && poolAsset && assetSymbol === poolAsset) {
        matchingPools.push(pool);
        return;
      }

      // Match by address if available
      // Note: We'd need to enhance PendlePool to include underlyingAssetAddress
      // For now, we'll rely on symbol matching
    });

    if (matchingPools.length > 0) {
      matches.set(assetSymbol || assetAddress, matchingPools);
    }
  });

  return matches;
}

/**
 * Check if an asset symbol matches a pool's underlying asset
 */
export function isAssetMatch(assetSymbol: string, poolAsset: string): boolean {
  const normalizedAsset = assetSymbol.toUpperCase().trim();
  const normalizedPool = poolAsset.toUpperCase().trim();

  // Exact match
  if (normalizedAsset === normalizedPool) {
    return true;
  }

  // Handle common variations
  // e.g., "USDC" matches "USDC", "sUSDC", "cUSDC", etc.
  if (normalizedPool.includes(normalizedAsset) || normalizedAsset.includes(normalizedPool)) {
    return true;
  }

  return false;
}

/**
 * Get all unique underlying assets from pools
 */
export function getUniqueUnderlyingAssets(pools: PendlePool[]): string[] {
  const assets = new Set<string>();
  pools.forEach((pool) => {
    if (pool.underlyingAsset) {
      assets.add(pool.underlyingAsset.toUpperCase());
    }
  });
  return Array.from(assets);
}

