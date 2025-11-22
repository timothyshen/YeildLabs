// Pendle Types
export interface PendlePool {
  address: string;
  name: string;
  symbol: string;
  underlyingAsset: string;
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

export interface UserPosition {
  pool: string;
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

export interface WalletAsset {
  token: string;
  symbol: string;
  balance: number;
  valueUSD: number;
}

// Strategy Types
export type RiskLevel = 'conservative' | 'neutral' | 'aggressive';

export interface Strategy {
  riskLevel: RiskLevel;
  pool: PendlePool;
  allocation: {
    pt: number;
    yt: number;
  };
  expectedAPY: number;
  maturityYield: number;
  risks: string[];
}

export interface StrategyRecommendation {
  conservative: Strategy;
  neutral: Strategy;
  aggressive: Strategy;
}

// Swap Types
export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  priceImpact: number;
  gas: string;
  route: string[];
}

// Simulator Types
export interface SimulatorInput {
  amount: number;
  asset: string;
  type: 'PT' | 'YT';
  duration: number;
  expectedAPY: number;
}

export interface SimulatorOutput {
  futureValue: number;
  apy: number;
  risks: string[];
  sensitivityCurve?: {
    apy: number;
    value: number;
  }[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
