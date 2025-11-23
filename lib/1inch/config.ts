/**
 * 1inch API Configuration
 * Docs: https://docs.1inch.io/docs/aggregation-protocol/api/swagger
 */

// Chain IDs supported by 1inch
export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  BSC: 56,
  POLYGON: 137,
  OPTIMISM: 10,
  ARBITRUM: 42161,
  GNOSIS: 100,
  AVALANCHE: 43114,
  FANTOM: 250,
  KLAYTN: 8217,
  AURORA: 1313161554,
  BASE: 8453,
  ZKSYNC: 324,
} as const;

export type ChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

// Base chain configuration
export const BASE_CHAIN_ID = SUPPORTED_CHAINS.BASE;

// 1inch API endpoints
export const API_BASE_URL = 'https://api.1inch.dev';
export const API_VERSION = 'v6.0';

// Common token addresses on Base
export const BASE_TOKENS = {
  // Native token
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',

  // Stablecoins
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  USDT: '0x...', // Add if needed
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',

  // USDe (Ethena)
  USDe: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',

  // Wrapped ETH
  WETH: '0x4200000000000000000000000000000000000006',

  // cbETH (Coinbase Wrapped Staked ETH)
  cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
} as const;

// Default slippage (1%)
export const DEFAULT_SLIPPAGE = 1;

// Maximum slippage warning threshold (5%)
export const MAX_SLIPPAGE_WARNING = 5;

// Gas multiplier for safety (1.2x)
export const GAS_MULTIPLIER = 1.2;

/**
 * Get 1inch API URL for a specific chain
 */
export function get1inchApiUrl(chainId: ChainId): string {
  return `${API_BASE_URL}/swap/${API_VERSION}/${chainId}`;
}

/**
 * Get API headers with authentication
 */
export function get1inchHeaders(): HeadersInit {
  const apiKey = process.env.ONEINCH_API_KEY || '';

  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Check if API key is configured
 */
export function is1inchConfigured(): boolean {
  return !!process.env.ONEINCH_API_KEY;
}
