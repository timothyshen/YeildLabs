/**
 * Type definitions for Pendle Yield Navigator
 * 
 * This file re-exports types from the unified data structure
 * and provides backward-compatible types for existing code.
 */

// Re-export unified types
export * from './unified';

// ============================================================================
// Backward-Compatible Types (Legacy)
// ============================================================================
// These types are kept for backward compatibility with existing code.
// New code should use the unified types from './unified'.

/**
 * @deprecated Use PendlePool from './unified' instead
 * Legacy PendlePool type (simplified)
 */
export interface PendlePool {
  address: string;
  name: string;
  symbol: string;
  underlyingAsset: string; // Legacy: just a string, not Token object
  maturity: number;
  tvl: number;
  apy: number;
  impliedYield: number;
  ptPrice: number;
  ytPrice: number;
  ptDiscount: number;
  daysToMaturity: number;
  strategyTag: 'Best PT' | 'Best YT' | 'Risky' | 'Neutral';
}

/**
 * @deprecated Use PendlePosition from './unified' instead
 * Legacy UserPosition type (simplified)
 */
export interface UserPosition {
  pool: string; // Pool address or name
  ptBalance: number;
  ytBalance: number;
  syBalance: number;
  lpBalance: number;
  maturityValue: number;
  costBasis: number;
  currentValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
}

/**
 * @deprecated Use WalletAsset from './unified' instead
 * Legacy WalletAsset type (simplified)
 */
export interface WalletAsset {
  token: string; // Token address
  symbol: string;
  balance: number;
  valueUSD: number;
}

// ============================================================================
// Type Adapters (Conversion Utilities)
// ============================================================================

import type {
  PendlePool as UnifiedPendlePool,
  PendlePosition as UnifiedPendlePosition,
  WalletAsset as UnifiedWalletAsset,
  Token,
} from './unified';

/**
 * Convert unified PendlePool to legacy format
 */
export function toLegacyPool(pool: UnifiedPendlePool): PendlePool {
  return {
    address: pool.address,
    name: pool.name,
    symbol: pool.symbol,
    underlyingAsset: pool.underlyingAsset.symbol,
    maturity: pool.maturity,
    tvl: pool.tvl,
    apy: pool.apy,
    impliedYield: pool.impliedYield,
    ptPrice: pool.ptPrice,
    ytPrice: pool.ytPrice,
    ptDiscount: pool.ptDiscount,
    daysToMaturity: pool.daysToMaturity,
    strategyTag: pool.strategyTag,
  };
}

/**
 * Convert legacy PendlePool to unified format
 */
export function toUnifiedPool(
  pool: PendlePool,
  tokenDefaults?: Partial<Token>
): UnifiedPendlePool {
  const defaultToken: Token = {
    address: pool.address,
    symbol: pool.underlyingAsset,
    name: pool.underlyingAsset,
    decimals: 18,
    chainId: 8453, // Base
    ...tokenDefaults,
  };

  return {
    address: pool.address,
    name: pool.name,
    symbol: pool.symbol,
    underlyingAsset: defaultToken,
    syToken: defaultToken, // Will need to be populated from actual data
    ptToken: defaultToken,
    ytToken: defaultToken,
    maturity: pool.maturity,
    maturityDate: new Date(pool.maturity * 1000).toISOString(),
    daysToMaturity: pool.daysToMaturity,
    isExpired: pool.maturity < Date.now() / 1000,
    tvl: pool.tvl,
    apy: pool.apy,
    impliedYield: pool.impliedYield,
    ptPrice: pool.ptPrice,
    ytPrice: pool.ytPrice,
    ptDiscount: pool.ptDiscount,
    syPrice: 1, // Default, should be fetched
    strategyTag: pool.strategyTag,
    riskLevel: pool.strategyTag === 'Best PT' ? 'conservative' :
               pool.strategyTag === 'Best YT' ? 'aggressive' :
               pool.strategyTag === 'Risky' ? 'aggressive' : 'neutral',
    updatedAt: Date.now(),
  };
}

/**
 * Convert unified PendlePosition to legacy format
 */
export function toLegacyPosition(position: UnifiedPendlePosition): UserPosition {
  return {
    pool: position.poolAddress,
    ptBalance: position.ptBalanceFormatted,
    ytBalance: position.ytBalanceFormatted,
    syBalance: position.syBalanceFormatted,
    lpBalance: position.lpBalanceFormatted,
    maturityValue: position.maturityValue,
    costBasis: position.costBasis,
    currentValue: position.currentValue,
    realizedPnL: position.realizedPnL,
    unrealizedPnL: position.unrealizedPnL,
  };
}

/**
 * Convert legacy UserPosition to unified format
 */
export function toUnifiedPosition(
  position: UserPosition,
  pool: UnifiedPendlePool
): UnifiedPendlePosition {
  const totalPnL = position.realizedPnL + position.unrealizedPnL;
  const pnlPercent = position.costBasis !== 0
    ? (totalPnL / position.costBasis) * 100
    : 0;

  return {
    poolAddress: position.pool,
    pool,
    ptBalance: position.ptBalance.toString(),
    ptBalanceFormatted: position.ptBalance,
    ytBalance: position.ytBalance.toString(),
    ytBalanceFormatted: position.ytBalance,
    syBalance: position.syBalance.toString(),
    syBalanceFormatted: position.syBalance,
    lpBalance: position.lpBalance.toString(),
    lpBalanceFormatted: position.lpBalance,
    costBasis: position.costBasis,
    currentValue: position.currentValue,
    maturityValue: position.maturityValue,
    realizedPnL: position.realizedPnL,
    unrealizedPnL: position.unrealizedPnL,
    totalPnL,
    pnlPercent,
    currentAPY: pool.apy,
    projectedYield: 0, // Will need calculation
    autoRollEnabled: false,
    autoRollDaysBeforeMaturity: 7,
    firstAcquired: Date.now(),
    lastUpdated: Date.now(),
  };
}

/**
 * Convert unified WalletAsset to legacy format
 */
export function toLegacyAsset(asset: UnifiedWalletAsset): WalletAsset {
  return {
    token: asset.token.address,
    symbol: asset.token.symbol,
    balance: asset.balanceFormatted,
    valueUSD: asset.valueUSD,
  };
}

/**
 * Convert legacy WalletAsset to unified format
 */
export function toUnifiedAsset(
  asset: WalletAsset,
  tokenDefaults?: Partial<Token>
): UnifiedWalletAsset {
  const token: Token = {
    address: asset.token,
    symbol: asset.symbol,
    name: asset.symbol,
    decimals: 18,
    chainId: 8453,
    ...tokenDefaults,
  };

  return {
    token,
    balance: asset.balance.toString(),
    balanceFormatted: asset.balance,
    valueUSD: asset.valueUSD,
    lastUpdated: Date.now(),
  };
}
