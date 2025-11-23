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
    // Handle both legacy WalletAsset (string token) and unified WalletAsset (Token object)
    const assetSymbol = (asset.token?.symbol || (asset as any).symbol || '').toUpperCase();
    const assetAddress = (asset.token?.address || (asset as any).token || '').toLowerCase();

    if (!assetSymbol && !assetAddress) {
      return; // Skip invalid assets
    }

    const matchingPools: PendlePool[] = [];

    allPools.forEach((pool) => {
      // Handle both legacy (string) and unified (Token object) underlyingAsset
      const poolAssetSymbol = (typeof pool.underlyingAsset === 'string' 
        ? pool.underlyingAsset 
        : pool.underlyingAsset?.symbol || '').toUpperCase();
      const poolAssetAddress = (typeof pool.underlyingAsset === 'string'
        ? ''
        : pool.underlyingAsset?.address || '').toLowerCase();

      // Match by symbol (case-insensitive)
      if (assetSymbol && poolAssetSymbol && assetSymbol === poolAssetSymbol) {
        matchingPools.push(pool);
        return;
      }

      // Match by address if available
      if (assetAddress && poolAssetAddress && assetAddress === poolAssetAddress) {
        matchingPools.push(pool);
        return;
      }

      // Fuzzy match: check if asset symbol is contained in pool name/symbol
      // e.g., "USDC" matches "PT-USDC-..." or "sUSDe" matches "PT-sUSDe-..."
      if (assetSymbol && poolAssetSymbol && (
        poolAssetSymbol.includes(assetSymbol) || 
        assetSymbol.includes(poolAssetSymbol)
      )) {
        matchingPools.push(pool);
        return;
      }
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
      const symbol = typeof pool.underlyingAsset === 'string'
        ? pool.underlyingAsset
        : pool.underlyingAsset.symbol || '';
      if (symbol) {
        assets.add(symbol.toUpperCase());
      }
    }
  });
  return Array.from(assets);
}

