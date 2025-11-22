import { base } from 'viem/chains';

// Network Configuration
export const SUPPORTED_CHAIN = base;
export const CHAIN_ID = base.id;

// Stablecoin Addresses on Base
export const STABLECOINS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  sUSDe: '', // Add when available
  cUSD: '', // Add when available
  USD0PP: '', // Add when available
  fUSD: '', // Add when available
  sKAITO: '', // Add when available
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  OCTAV: '/api/octav',
  PENDLE: '/api/pendle',
  SWAP: '/api/swap',
  STRATEGY: '/api/strategy',
} as const;

// Strategy Configuration
export const STRATEGY_THRESHOLDS = {
  PT_DISCOUNT_MIN: 0.02, // 2% minimum discount
  HIGH_YIELD_THRESHOLD: 10, // 10% APY
  RISK_WARNING_THRESHOLD: 20, // 20% APY - show risk warning
  AUTO_ROLL_DAYS: 7, // Auto-roll 7 days before maturity
} as const;

// UI Configuration
export const STABLECOIN_POOLS = [
  'USDC',
  'sUSDe',
  'cUSD',
  'USD0++',
  'fUSD',
  'sKAITO',
] as const;

export const RISK_LEVELS = ['conservative', 'neutral', 'aggressive'] as const;
