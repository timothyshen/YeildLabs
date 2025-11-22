/**
 * Unified Data Structure for Pendle Yield Navigator
 * 
 * This file consolidates all data types used across the application,
 * aligned with the Product Design SOT (State of Things).
 * 
 * @version 0.1
 * @date 2025-01
 */

// ============================================================================
// Core Token & Asset Types
// ============================================================================

/**
 * Token metadata and pricing information
 */
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number; // Base = 8453
  logoURI?: string;
  priceUSD?: number; // Current USD price
}

/**
 * Wallet asset holding (liquid tokens)
 */
export interface WalletAsset {
  token: Token;
  balance: string; // Raw balance (wei/units)
  balanceFormatted: number; // Human-readable balance
  valueUSD: number; // USD value
  lastUpdated: number; // Timestamp
}

// ============================================================================
// Pendle Pool & Market Data
// ============================================================================

/**
 * Pendle pool market data (from Octav/Pendle SDK)
 */
export interface PendlePool {
  // Pool identification
  address: string;
  name: string; // e.g., "PT-sUSDe-26DEC2024"
  symbol: string; // e.g., "PT-sUSDe"
  
  // Underlying asset
  underlyingAsset: Token;
  syToken: Token; // SY token address
  ptToken: Token; // PT token address
  ytToken: Token; // YT token address
  
  // Maturity & timing
  maturity: number; // Unix timestamp
  maturityDate: string; // ISO date string
  daysToMaturity: number;
  isExpired: boolean;
  
  // Market metrics
  tvl: number; // Total Value Locked in USD
  apy: number; // Current APY (%)
  impliedYield: number; // Implied yield from PT discount (%)
  
  // Pricing
  ptPrice: number; // PT price (0-1, typically < 1)
  ytPrice: number; // YT price (0-1, typically < 1)
  ptDiscount: number; // PT discount (0-1)
  syPrice: number; // SY price
  
  // Strategy tags (from x402 agent or calculation)
  strategyTag: StrategyTag;
  riskLevel: RiskLevel;
  
  // Additional metadata
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Strategy tag for pool classification
 */
export type StrategyTag = 'Best PT' | 'Best YT' | 'Risky' | 'Neutral';

/**
 * Risk level classification
 */
export type RiskLevel = 'conservative' | 'neutral' | 'aggressive';

// ============================================================================
// User Positions & Holdings
// ============================================================================

/**
 * User's position in a Pendle pool
 * Combines PT, YT, SY, and LP holdings
 */
export interface PendlePosition {
  // Pool reference
  poolAddress: string;
  pool: PendlePool; // Full pool data
  
  // Token balances
  ptBalance: string; // Raw balance
  ptBalanceFormatted: number;
  ytBalance: string;
  ytBalanceFormatted: number;
  syBalance: string;
  syBalanceFormatted: number;
  lpBalance: string;
  lpBalanceFormatted: number;
  
  // Valuation
  costBasis: number; // Total cost in USD
  currentValue: number; // Current market value in USD
  maturityValue: number; // Expected value at maturity (PT only)
  
  // PnL tracking
  realizedPnL: number; // Realized profit/loss in USD
  unrealizedPnL: number; // Unrealized profit/loss in USD
  totalPnL: number; // Total PnL (realized + unrealized)
  pnlPercent: number; // PnL as percentage of cost basis
  
  // Yield metrics
  currentAPY: number; // Current APY for this position
  projectedYield: number; // Projected yield until maturity
  
  // Auto-roll settings
  autoRollEnabled: boolean;
  autoRollDaysBeforeMaturity: number; // Default: 7
  
  // Metadata
  firstAcquired: number; // Timestamp
  lastUpdated: number; // Timestamp
}

/**
 * Complete wallet state (from Octav API)
 */
export interface WalletState {
  address: string;
  label?: string;
  
  // Assets
  assets: WalletAsset[];
  totalAssetsValue: number;
  
  // Positions
  positions: PendlePosition[];
  totalPositionsValue: number;
  
  // Aggregated metrics
  totalValueUSD: number;
  totalPnL: number;
  weightedAPY: number;
  
  // Metadata
  lastSynced: number; // Last sync with Octav
  isActive: boolean;
}

// ============================================================================
// Strategy & Recommendations
// ============================================================================

/**
 * Strategy allocation (PT/YT split)
 */
export interface StrategyAllocation {
  pt: number; // Percentage (0-100)
  yt: number; // Percentage (0-100)
  usdc: number; // Remaining in USDC (0-100)
}

/**
 * Strategy recommendation from x402 agent
 */
export interface Strategy {
  riskLevel: RiskLevel;
  pool: PendlePool;
  allocation: StrategyAllocation;
  
  // Expected outcomes
  expectedAPY: number;
  maturityYield: number; // For PT positions
  projectedValue: number; // Projected value at end of period
  
  // Risk analysis
  risks: string[];
  riskScore: number; // 0-100, higher = riskier
  
  // Execution details
  estimatedGas: string;
  estimatedSlippage: number;
  
  // Metadata
  confidence: number; // 0-100, agent confidence
  reasoning?: string; // Human-readable explanation
}

/**
 * Complete strategy recommendation set
 */
export interface StrategyRecommendation {
  conservative: Strategy;
  neutral: Strategy;
  aggressive: Strategy;
  
  // Common metadata
  generatedAt: number;
  walletAddress: string;
  totalAvailableUSD: number;
}

// ============================================================================
// Swap & Execution
// ============================================================================

/**
 * Swap quote from 1inch API
 */
export interface SwapQuote {
  fromToken: Token;
  toToken: Token;
  fromAmount: string; // Raw amount
  toAmount: string; // Raw amount
  fromAmountFormatted: number;
  toAmountFormatted: number;
  
  // Pricing
  priceImpact: number; // Percentage
  effectivePrice: number; // Effective exchange rate
  
  // Execution details
  gasEstimate: string; // Gas in wei
  gasEstimateUSD: number;
  route: Token[]; // Swap route
  
  // Metadata
  quoteId?: string;
  expiresAt?: number;
  provider: '1inch' | 'direct';
}

/**
 * Strategy execution plan
 * Represents the full flow: Swap → SY → PT/YT
 */
export interface ExecutionPlan {
  // Input
  fromToken: Token;
  fromAmount: string;
  targetPool: PendlePool;
  targetType: 'PT' | 'YT' | 'SY';
  allocation: StrategyAllocation;
  
  // Steps
  steps: ExecutionStep[];
  
  // Totals
  totalGasEstimate: string;
  totalGasEstimateUSD: number;
  estimatedSlippage: number;
  estimatedTime: number; // Seconds
  
  // Status
  status: 'draft' | 'ready' | 'executing' | 'completed' | 'failed';
  txHashes?: string[];
}

/**
 * Single step in execution plan
 */
export interface ExecutionStep {
  step: number;
  type: 'swap' | 'approve' | 'mint_sy' | 'mint_pt' | 'mint_yt';
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  gasEstimate: string;
  contractAddress: string;
  data?: string; // Encoded transaction data
}

// ============================================================================
// Auto-Roll Configuration
// ============================================================================

/**
 * Auto-roll configuration for a position
 */
export interface AutoRollConfig {
  positionAddress: string; // Pool address
  enabled: boolean;
  daysBeforeMaturity: number; // Trigger X days before maturity
  targetPool?: PendlePool; // Target pool for roll (optional, auto-select if not set)
  slippageTolerance: number; // Max slippage (0-100)
  gasPriceLimit?: string; // Max gas price (optional)
  
  // Execution history
  lastRolled?: number;
  rollCount: number;
}

// ============================================================================
// Simulator
// ============================================================================

/**
 * Simulator input parameters
 */
export interface SimulatorInput {
  amount: number; // USD amount
  asset: string; // Asset symbol (USDC, sUSDe, etc.)
  type: 'PT' | 'YT';
  duration: number; // Days
  expectedAPY: number; // Expected APY (%)
  pool?: PendlePool; // Optional: specific pool to simulate
}

/**
 * Simulator output/results
 */
export interface SimulatorOutput {
  // Projected values
  futureValue: number; // Projected value at end of period
  totalYield: number; // Total yield earned
  annualizedReturn: number; // Annualized return (%)
  
  // Risk analysis
  risks: string[];
  riskScore: number;
  
  // Sensitivity analysis (for YT)
  sensitivityCurve?: SensitivityPoint[];
  
  // Comparison
  vsHolding: number; // vs holding underlying asset
  vsCurrentAPY: number; // vs current market APY
}

/**
 * Sensitivity point for APY sensitivity curve
 */
export interface SensitivityPoint {
  apy: number; // APY value
  value: number; // Projected value at this APY
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: number;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Dashboard & Analytics
// ============================================================================

/**
 * Yield metrics for dashboard
 */
export interface YieldMetrics {
  dailyYield: number;
  weeklyYield: number;
  monthlyYield: number;
  projectedAnnual: number;
  weightedAPY: number;
  totalYieldEarned: number; // Historical
}

/**
 * Portfolio allocation breakdown
 */
export interface PortfolioAllocation {
  label: string;
  value: number;
  percentage: number;
  color: string;
  type: 'asset' | 'pt' | 'yt' | 'sy' | 'lp';
}

/**
 * Performance data point for charts
 */
export interface PerformanceDataPoint {
  date: string; // ISO date string
  timestamp: number;
  value: number; // Portfolio value in USD
  yield: number; // Yield earned this period
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Supported stablecoins (from SOT)
 */
export type StablecoinSymbol = 'USDC' | 'sUSDe' | 'cUSD' | 'USD0++' | 'fUSD' | 'sKAITO';

/**
 * Network/Chain configuration
 */
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// ============================================================================
// Type Guards & Helpers
// ============================================================================

/**
 * Type guard to check if a pool is a stablecoin pool
 */
export function isStablecoinPool(pool: PendlePool): boolean {
  const stablecoins: StablecoinSymbol[] = ['USDC', 'sUSDe', 'cUSD', 'USD0++', 'fUSD', 'sKAITO'];
  return stablecoins.includes(pool.underlyingAsset.symbol as StablecoinSymbol);
}

/**
 * Calculate total PnL for a position
 */
export function calculateTotalPnL(position: PendlePosition): number {
  return position.realizedPnL + position.unrealizedPnL;
}

/**
 * Calculate PnL percentage
 */
export function calculatePnLPercent(position: PendlePosition): number {
  if (position.costBasis === 0) return 0;
  return (calculateTotalPnL(position) / position.costBasis) * 100;
}

