/**
 * Token Address Utilities
 * 
 * Helper functions to get token addresses from local constants
 */

import tokenAddresses from '@/lib/constants/token_address.json';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  priceUSD: number;
}

/**
 * Get token address by symbol
 */
export function getTokenAddressBySymbol(
  symbol: string,
  chainId: number = 8453
): string | null {
  if (!symbol) return null;
  
  const normalizedSymbol = symbol.toUpperCase().trim();
  
  const token = tokenAddresses.find(
    (t: TokenInfo) =>
      t.symbol.toUpperCase() === normalizedSymbol &&
      t.chainId === chainId
  );
  
  return token?.address || null;
}

/**
 * Get full token info by symbol
 */
export function getTokenInfoBySymbol(
  symbol: string,
  chainId: number = 8453
): TokenInfo | null {
  if (!symbol) return null;
  
  const normalizedSymbol = symbol.toUpperCase().trim();
  
  const token = tokenAddresses.find(
    (t: TokenInfo) =>
      t.symbol.toUpperCase() === normalizedSymbol &&
      t.chainId === chainId
  );
  
  return token || null;
}

/**
 * Get token address by symbol (case-insensitive, partial match)
 */
export function findTokenAddressBySymbol(
  symbol: string,
  chainId: number = 8453
): string | null {
  if (!symbol) return null;
  
  const normalizedSymbol = symbol.toUpperCase().trim();
  
  // Try exact match first
  const exactMatch = tokenAddresses.find(
    (t: TokenInfo) =>
      t.symbol.toUpperCase() === normalizedSymbol &&
      t.chainId === chainId
  );
  
  if (exactMatch) return exactMatch.address;
  
  // Try partial match
  const partialMatch = tokenAddresses.find(
    (t: TokenInfo) =>
      t.symbol.toUpperCase().includes(normalizedSymbol) &&
      t.chainId === chainId
  );
  
  return partialMatch?.address || null;
}

/**
 * Get all tokens for a specific chain
 */
export function getTokensByChain(chainId: number): TokenInfo[] {
  return tokenAddresses.filter((t: TokenInfo) => t.chainId === chainId);
}

