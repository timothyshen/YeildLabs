/**
 * Octav Data Transformation Utilities
 * 
 * Converts Octav API responses to our unified data structure
 */

import type {
  OctavPortfolio,
  OctavAsset,
  OctavProtocol,
} from '@/types/octav';

import type {
  WalletAsset as UnifiedWalletAsset,
  PendlePosition as UnifiedPendlePosition,
  WalletState,
  Token,
  PendlePool,
} from '@/types/unified';

import type {
  WalletAsset,
  UserPosition,
} from '@/types';

import {
  normalizeAssetData,
  normalizePositionData,
  buildWalletState,
} from './dataTransform';

/**
 * Extract Pendle protocol from Octav portfolio
 */
export function extractPendleProtocol(portfolio: OctavPortfolio): OctavProtocol | null {
  // Check if assetByProtocols exists
  if (!portfolio.assetByProtocols || typeof portfolio.assetByProtocols !== 'object') {
    return null;
  }

  // Look for Pendle protocol in assetByProtocols
  const pendleKeys = Object.keys(portfolio.assetByProtocols).filter(key =>
    key.toLowerCase().includes('pendle')
  );

  if (pendleKeys.length === 0) {
    return null;
  }

  // Return the first Pendle protocol found
  return portfolio.assetByProtocols[pendleKeys[0]];
}

/**
 * Extract wallet assets (non-Pendle) from Octav portfolio
 */
export function extractWalletAssets(portfolio: OctavPortfolio): OctavAsset[] {
  // Check if assetByProtocols exists
  if (!portfolio.assetByProtocols || typeof portfolio.assetByProtocols !== 'object') {
    return [];
  }

  const walletProtocol = portfolio.assetByProtocols['wallet'];
  if (!walletProtocol || !walletProtocol.assets) {
    return [];
  }

  return walletProtocol.assets;
}

/**
 * Convert Octav asset to unified WalletAsset
 */
export function octavAssetToUnified(
  asset: OctavAsset,
  chainId: number = 8453, // Base chain
  lastUpdated?: number
): UnifiedWalletAsset {
  const token: Token = {
    address: asset.contractAddress || '',
    symbol: asset.symbol,
    name: asset.symbol,
    decimals: 18, // Default, should be fetched from token contract if needed
    chainId,
    priceUSD: parseFloat(asset.price) || 0,
  };

  return {
    token,
    balance: asset.balance,
    balanceFormatted: parseFloat(asset.balance) || 0,
    valueUSD: parseFloat(asset.value) || 0,
    lastUpdated: lastUpdated || Date.now(),
  };
}

/**
 * Convert Octav Pendle assets to PendlePosition
 * Note: This requires pool data to be fetched separately
 */
export function octavPendleToPosition(
  asset: OctavAsset,
  pool: PendlePool,
  portfolio: OctavPortfolio
): UnifiedPendlePosition {
  const balance = parseFloat(asset.balance) || 0;
  const value = parseFloat(asset.value) || 0;
  
  // Determine if this is PT or YT based on symbol
  const isPT = asset.symbol.toLowerCase().includes('pt') || 
               asset.symbol.toLowerCase().startsWith('pt-');
  const isYT = asset.symbol.toLowerCase().includes('yt') || 
               asset.symbol.toLowerCase().startsWith('yt-');

  // Calculate PnL
  const costBasis = portfolio.totalCostBasis !== 'N/A' 
    ? parseFloat(portfolio.totalCostBasis) 
    : value * 0.95; // Estimate if not available
  const unrealizedPnL = value - costBasis;
  const totalPnL = unrealizedPnL;
  const pnlPercent = costBasis !== 0 ? (totalPnL / costBasis) * 100 : 0;

  // Calculate maturity value (for PT)
  const maturityValue = isPT 
    ? balance / pool.ptPrice // PT will be worth 1 at maturity
    : value; // YT value is market-based

  return {
    poolAddress: pool.address,
    pool,
    ptBalance: isPT ? asset.balance : '0',
    ptBalanceFormatted: isPT ? balance : 0,
    ytBalance: isYT ? asset.balance : '0',
    ytBalanceFormatted: isYT ? balance : 0,
    syBalance: '0',
    syBalanceFormatted: 0,
    lpBalance: '0',
    lpBalanceFormatted: 0,
    costBasis,
    currentValue: value,
    maturityValue,
    realizedPnL: 0,
    unrealizedPnL,
    totalPnL,
    pnlPercent,
    currentAPY: pool.apy,
    projectedYield: 0, // Will need calculation
    autoRollEnabled: false,
    autoRollDaysBeforeMaturity: 7,
    firstAcquired: parseInt(portfolio.lastUpdated) || Date.now(),
    lastUpdated: parseInt(portfolio.lastUpdated) || Date.now(),
  };
}

/**
 * Convert Octav portfolio to legacy format (for backward compatibility)
 */
export function octavToLegacyFormat(portfolio: OctavPortfolio): {
  assets: WalletAsset[];
  positions: UserPosition[];
  totalValueUSD: number;
} {
  // Validate portfolio structure
  if (!portfolio || typeof portfolio !== 'object') {
    console.warn('Invalid portfolio data received');
    return {
      assets: [],
      positions: [],
      totalValueUSD: 0,
    };
  }

  // Safely extract wallet assets
  const walletAssets = extractWalletAssets(portfolio);
  const assets: WalletAsset[] = walletAssets.map(asset => ({
    token: asset?.contractAddress || '',
    symbol: asset?.symbol || 'UNKNOWN',
    balance: parseFloat(asset?.balance || '0') || 0,
    valueUSD: parseFloat(asset?.value || '0') || 0,
  }));

  // Extract Pendle positions
  const pendleProtocol = extractPendleProtocol(portfolio);
  const positions: UserPosition[] = [];

  if (pendleProtocol && pendleProtocol.assets && Array.isArray(pendleProtocol.assets)) {
    // Convert Pendle assets to positions
    // Note: This is simplified - in production, we'd need to match with pool data
    pendleProtocol.assets.forEach(asset => {
      if (!asset) return;
      
      const isPT = asset.symbol?.toLowerCase().includes('pt') || false;
      const isYT = asset.symbol?.toLowerCase().includes('yt') || false;

      if (isPT || isYT) {
        positions.push({
          pool: asset.contractAddress || asset.symbol || 'unknown',
          ptBalance: isPT ? parseFloat(asset.balance || '0') : 0,
          ytBalance: isYT ? parseFloat(asset.balance || '0') : 0,
          syBalance: 0,
          lpBalance: 0,
          maturityValue: isPT ? parseFloat(asset.balance || '0') : 0,
          costBasis: parseFloat(asset.value || '0') * 0.95, // Estimate
          currentValue: parseFloat(asset.value || '0'),
          realizedPnL: 0,
          unrealizedPnL: parseFloat(asset.value || '0') * 0.05, // Estimate
        });
      }
    });
  }

  const totalValueUSD = parseFloat(portfolio.networth || '0') || 0;

  return {
    assets,
    positions,
    totalValueUSD,
  };
}

/**
 * Convert Octav portfolio to unified WalletState
 * Note: Requires pool data to be fetched separately for Pendle positions
 */
export function octavToWalletState(
  portfolio: OctavPortfolio,
  pools: PendlePool[] = []
): WalletState {
  // Extract wallet assets
  const lastUpdated = parseInt(portfolio.lastUpdated) || Date.now();
  const walletAssets = extractWalletAssets(portfolio).map(asset =>
    octavAssetToUnified(asset, 8453, lastUpdated)
  );

  // Extract Pendle positions
  const pendleProtocol = extractPendleProtocol(portfolio);
  const positions: UnifiedPendlePosition[] = [];

  if (pendleProtocol) {
    pendleProtocol.assets.forEach(asset => {
      // Try to match with pool data
      const matchingPool = pools.find(pool => {
        const symbol = asset.symbol.toLowerCase();
        return symbol.includes(pool.underlyingAsset.symbol.toLowerCase()) ||
               symbol.includes(pool.symbol.toLowerCase());
      });

      if (matchingPool) {
        const position = octavPendleToPosition(asset, matchingPool, portfolio);
        positions.push(position);
      }
    });
  }

  // Calculate totals
  const totalAssetsValue = walletAssets.reduce((sum, a) => sum + a.valueUSD, 0);
  const totalPositionsValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalValueUSD = parseFloat(portfolio.networth) || (totalAssetsValue + totalPositionsValue);
  const totalPnL = positions.reduce((sum, p) => sum + p.totalPnL, 0);

  // Calculate weighted APY
  const weightedAPY = positions.length > 0
    ? positions.reduce((sum, p) => sum + (p.currentAPY * p.currentValue), 0) / totalPositionsValue
    : 0;

  return {
    address: portfolio.address,
    assets: walletAssets,
    totalAssetsValue,
    positions,
    totalPositionsValue,
    totalValueUSD,
    totalPnL,
    weightedAPY,
    lastSynced: parseInt(portfolio.lastUpdated) || Date.now(),
    isActive: false,
  };
}

/**
 * Get chain ID from Octav chain key
 */
export function getChainIdFromOctavKey(chainKey: string): number {
  const chainMap: Record<string, number> = {
    'ethereum': 1,
    'base': 8453,
    'arbitrum': 42161,
    'optimism': 10,
    'polygon': 137,
    'solana': -1, // Not supported yet
  };

  return chainMap[chainKey.toLowerCase()] || 8453; // Default to Base
}

