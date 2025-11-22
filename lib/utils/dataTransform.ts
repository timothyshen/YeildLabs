/**
 * Data Transformation Utilities
 * 
 * Helper functions to transform data between legacy and unified formats,
 * and to normalize data from various sources (Octav, Pendle SDK, etc.)
 */

import type {
  PendlePool as UnifiedPendlePool,
  PendlePosition as UnifiedPendlePosition,
  WalletAsset as UnifiedWalletAsset,
  WalletState,
  Token,
  StrategyTag,
  RiskLevel,
} from '@/types/unified';

import type {
  PendlePool,
  UserPosition,
  WalletAsset,
} from '@/types';

/**
 * Determine strategy tag based on pool metrics
 */
export function calculateStrategyTag(
  apy: number,
  impliedYield: number,
  ptDiscount: number,
  daysToMaturity: number
): StrategyTag {
  const yieldDiff = impliedYield - apy;
  const discountPercent = ptDiscount * 100;

  // Best PT: High discount, implied yield significantly higher than APY
  if (discountPercent > 3 && yieldDiff > 1) {
    return 'Best PT';
  }

  // Best YT: High APY, low discount, potential for APY growth
  if (apy > 20 && discountPercent < 2 && daysToMaturity > 60) {
    return 'Best YT';
  }

  // Risky: Very high APY or very high discount (volatility risk)
  if (apy > 30 || discountPercent > 10) {
    return 'Risky';
  }

  return 'Neutral';
}

/**
 * Determine risk level from strategy tag
 */
export function tagToRiskLevel(tag: StrategyTag): RiskLevel {
  switch (tag) {
    case 'Best PT':
      return 'conservative';
    case 'Best YT':
      return 'aggressive';
    case 'Risky':
      return 'aggressive';
    default:
      return 'neutral';
  }
}

/**
 * Normalize pool data from API response
 */
export function normalizePoolData(
  data: Partial<PendlePool>,
  defaults?: Partial<UnifiedPendlePool>
): UnifiedPendlePool {
  const underlyingAsset: Token = {
    address: data.underlyingAsset || '',
    symbol: data.underlyingAsset || 'UNKNOWN',
    name: data.underlyingAsset || 'Unknown Asset',
    decimals: 18,
    chainId: 8453,
    ...defaults?.underlyingAsset,
  };

  const now = Date.now() / 1000;
  const maturity = data.maturity || now + 86400 * 30; // Default 30 days
  const daysToMaturity = data.daysToMaturity || Math.ceil((maturity - now) / 86400);

  return {
    address: data.address || '',
    name: data.name || '',
    symbol: data.symbol || '',
    underlyingAsset,
    syToken: underlyingAsset, // Will need actual SY token address
    ptToken: underlyingAsset, // Will need actual PT token address
    ytToken: underlyingAsset, // Will need actual YT token address
    maturity,
    maturityDate: new Date(maturity * 1000).toISOString(),
    daysToMaturity,
    isExpired: maturity < now,
    tvl: data.tvl || 0,
    apy: data.apy || 0,
    impliedYield: data.impliedYield || data.apy || 0,
    ptPrice: data.ptPrice || 0.95,
    ytPrice: data.ytPrice || 0.05,
    ptDiscount: data.ptDiscount || 0.05,
    syPrice: 1, // Default, should be fetched
    strategyTag: data.strategyTag || calculateStrategyTag(
      data.apy || 0,
      data.impliedYield || data.apy || 0,
      data.ptDiscount || 0.05,
      daysToMaturity
    ),
    riskLevel: tagToRiskLevel(data.strategyTag || 'Neutral'),
    updatedAt: Date.now(),
    ...defaults,
  };
}

/**
 * Normalize position data from API response
 */
export function normalizePositionData(
  data: Partial<UserPosition>,
  pool: UnifiedPendlePool
): UnifiedPendlePosition {
  const totalPnL = (data.realizedPnL || 0) + (data.unrealizedPnL || 0);
  const pnlPercent = (data.costBasis || 0) !== 0
    ? (totalPnL / data.costBasis!) * 100
    : 0;

  return {
    poolAddress: data.pool || pool.address,
    pool,
    ptBalance: (data.ptBalance || 0).toString(),
    ptBalanceFormatted: data.ptBalance || 0,
    ytBalance: (data.ytBalance || 0).toString(),
    ytBalanceFormatted: data.ytBalance || 0,
    syBalance: (data.syBalance || 0).toString(),
    syBalanceFormatted: data.syBalance || 0,
    lpBalance: (data.lpBalance || 0).toString(),
    lpBalanceFormatted: data.lpBalance || 0,
    costBasis: data.costBasis || 0,
    currentValue: data.currentValue || 0,
    maturityValue: data.maturityValue || data.currentValue || 0,
    realizedPnL: data.realizedPnL || 0,
    unrealizedPnL: data.unrealizedPnL || 0,
    totalPnL,
    pnlPercent,
    currentAPY: pool.apy,
    projectedYield: 0, // Will need calculation based on pool and time
    autoRollEnabled: false,
    autoRollDaysBeforeMaturity: 7,
    firstAcquired: Date.now(),
    lastUpdated: Date.now(),
  };
}

/**
 * Normalize wallet asset data from API response
 */
export function normalizeAssetData(
  data: Partial<WalletAsset>,
  defaults?: Partial<Token>
): UnifiedWalletAsset {
  const token: Token = {
    address: data.token || '',
    symbol: data.symbol || 'UNKNOWN',
    name: data.symbol || 'Unknown Token',
    decimals: 18,
    chainId: 8453,
    ...defaults,
  };

  return {
    token,
    balance: (data.balance || 0).toString(),
    balanceFormatted: data.balance || 0,
    valueUSD: data.valueUSD || 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Build complete wallet state from components
 */
export function buildWalletState(
  address: string,
  assets: UnifiedWalletAsset[],
  positions: UnifiedPendlePosition[],
  label?: string
): WalletState {
  const totalAssetsValue = assets.reduce((sum, a) => sum + a.valueUSD, 0);
  const totalPositionsValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalValueUSD = totalAssetsValue + totalPositionsValue;
  const totalPnL = positions.reduce((sum, p) => sum + p.totalPnL, 0);

  // Calculate weighted APY
  const weightedAPY = positions.length > 0
    ? positions.reduce((sum, p) => sum + (p.currentAPY * p.currentValue), 0) / totalPositionsValue
    : 0;

  return {
    address,
    label,
    assets,
    totalAssetsValue,
    positions,
    totalPositionsValue,
    totalValueUSD,
    totalPnL,
    weightedAPY,
    lastSynced: Date.now(),
    isActive: false,
  };
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(
  amount: number | string,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  // Handle very small numbers
  if (num < 0.0001 && num > 0) {
    return '< 0.0001';
  }
  
  return num.toFixed(displayDecimals);
}

/**
 * Format USD value for display
 */
export function formatUSD(value: number, showCents: boolean = true): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format TVL for display
 */
export function formatTVL(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return formatUSD(value);
}

/**
 * Calculate days until maturity
 */
export function calculateDaysToMaturity(maturityTimestamp: number): number {
  const now = Date.now() / 1000;
  const days = Math.ceil((maturityTimestamp - now) / 86400);
  return Math.max(0, days);
}

