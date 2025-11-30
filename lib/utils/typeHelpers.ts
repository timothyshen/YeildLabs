/**
 * Type Helper Utilities
 *
 * These helpers provide safe access to data that may be in either
 * legacy or unified type formats, avoiding runtime errors from
 * type mismatches.
 */

// Type guard to check if value is a Token-like object
export function isTokenObject(value: unknown): value is { address: string; symbol: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'address' in value &&
    'symbol' in value
  );
}

// Type guard to check if value is a string
export function isTokenString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Safely extract token address from WalletAsset
 * Works with both legacy (token: string) and unified (token: Token) formats
 */
export function getTokenAddress(asset: { token: unknown }): string {
  const token = asset.token;
  if (isTokenString(token)) {
    return token;
  }
  if (isTokenObject(token)) {
    return token.address;
  }
  return '';
}

/**
 * Safely extract token symbol from WalletAsset
 * Works with both legacy and unified formats
 */
export function getTokenSymbol(asset: { token: unknown; symbol?: string }): string {
  const token = asset.token;
  if (isTokenString(token)) {
    return asset.symbol || '';
  }
  if (isTokenObject(token)) {
    return token.symbol;
  }
  return '';
}

/**
 * Safely extract balance as number from WalletAsset
 * Works with both legacy (balance: number) and unified (balance: string) formats
 */
export function getBalance(asset: { balance: unknown; balanceFormatted?: number }): number {
  if (typeof asset.balance === 'number') {
    return asset.balance;
  }
  if (typeof asset.balance === 'string') {
    return parseFloat(asset.balance) || 0;
  }
  if (asset.balanceFormatted !== undefined) {
    return asset.balanceFormatted;
  }
  return 0;
}

// Pool type definition for type helpers
interface PoolLike {
  underlyingAsset: unknown;
  underlyingAssetAddress?: string;
  ptToken?: unknown;
  ptAddress?: string;
  ytToken?: unknown;
  ytAddress?: string;
  syToken?: unknown;
  syAddress?: string;
  maturity?: number;
  isExpired?: boolean;
}

/**
 * Safely extract underlying asset symbol from PendlePool
 * Works with both legacy (underlyingAsset: string) and unified (underlyingAsset: Token) formats
 */
export function getUnderlyingSymbol(pool: PoolLike): string {
  if (typeof pool.underlyingAsset === 'string') {
    return pool.underlyingAsset;
  }
  if (isTokenObject(pool.underlyingAsset)) {
    return pool.underlyingAsset.symbol;
  }
  return '';
}

/**
 * Safely extract underlying asset address from PendlePool
 */
export function getUnderlyingAddress(pool: PoolLike): string {
  if (typeof pool.underlyingAsset === 'string') {
    return pool.underlyingAssetAddress || '';
  }
  if (isTokenObject(pool.underlyingAsset)) {
    return pool.underlyingAsset.address;
  }
  return '';
}

/**
 * Safely extract PT token address from PendlePool
 */
export function getPtTokenAddress(pool: PoolLike): string {
  if (pool.ptToken && isTokenObject(pool.ptToken)) {
    return pool.ptToken.address;
  }
  if (pool.ptAddress) {
    return pool.ptAddress;
  }
  return '';
}

/**
 * Safely extract YT token address from PendlePool
 */
export function getYtTokenAddress(pool: PoolLike): string {
  if (pool.ytToken && isTokenObject(pool.ytToken)) {
    return pool.ytToken.address;
  }
  if (pool.ytAddress) {
    return pool.ytAddress;
  }
  return '';
}

/**
 * Safely extract SY token address from PendlePool
 */
export function getSyTokenAddress(pool: PoolLike): string {
  if (pool.syToken && isTokenObject(pool.syToken)) {
    return pool.syToken.address;
  }
  if (pool.syAddress) {
    return pool.syAddress;
  }
  return '';
}

/**
 * Check if pool has expired
 */
export function isPoolExpired(pool: PoolLike): boolean {
  if (pool.isExpired !== undefined) {
    return pool.isExpired;
  }
  if (pool.maturity) {
    return pool.maturity < Date.now() / 1000;
  }
  return false;
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: string, prefixLen = 6, suffixLen = 4): string {
  if (!address || address.length < prefixLen + suffixLen) {
    return address || '';
  }
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

// Asset-like type for normalization
interface AssetLike {
  token: unknown;
  symbol?: string;
  balance: unknown;
  balanceFormatted?: number;
  valueUSD?: number;
}

// Pool-like type for normalization
interface NormalizePoolLike extends PoolLike {
  address: string;
  name: string;
  symbol: string;
  daysToMaturity: number;
  tvl: number;
  apy: number;
  impliedYield: number;
  ptPrice: number;
  ytPrice: number;
  ptDiscount: number;
  strategyTag: string;
}

/**
 * Normalize asset data to a consistent format
 */
export function normalizeAsset(asset: AssetLike): {
  address: string;
  symbol: string;
  balance: number;
  valueUSD: number;
} {
  return {
    address: getTokenAddress(asset),
    symbol: getTokenSymbol(asset),
    balance: getBalance(asset),
    valueUSD: asset.valueUSD || 0,
  };
}

/**
 * Normalize pool data to a consistent format
 */
export function normalizePool(pool: NormalizePoolLike): {
  address: string;
  name: string;
  symbol: string;
  underlyingSymbol: string;
  underlyingAddress: string;
  ptAddress: string;
  ytAddress: string;
  syAddress: string;
  maturity: number;
  daysToMaturity: number;
  isExpired: boolean;
  tvl: number;
  apy: number;
  impliedYield: number;
  ptPrice: number;
  ytPrice: number;
  ptDiscount: number;
  strategyTag: string;
} {
  return {
    address: pool.address,
    name: pool.name,
    symbol: pool.symbol,
    underlyingSymbol: getUnderlyingSymbol(pool),
    underlyingAddress: getUnderlyingAddress(pool),
    ptAddress: getPtTokenAddress(pool),
    ytAddress: getYtTokenAddress(pool),
    syAddress: getSyTokenAddress(pool),
    maturity: pool.maturity || 0,
    daysToMaturity: pool.daysToMaturity,
    isExpired: isPoolExpired(pool),
    tvl: pool.tvl,
    apy: pool.apy,
    impliedYield: pool.impliedYield,
    ptPrice: pool.ptPrice,
    ytPrice: pool.ytPrice,
    ptDiscount: pool.ptDiscount,
    strategyTag: pool.strategyTag,
  };
}
