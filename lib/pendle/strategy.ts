/**
 * Pendle Strategy Suggestion Engine
 *
 * Unified engine for suggesting optimal PT/YT allocations based on:
 * - Market conditions (PT discount, APY trends, implied yield)
 * - Pool characteristics (TVL, maturity, liquidity)
 * - User risk profile
 * - Investment amount and goals
 *
 * @module lib/pendle/strategy
 */

import type { PendlePool } from '@/types';

// ============================================================================
// Types
// ============================================================================

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
export type StrategyType = 'PT' | 'YT' | 'SPLIT';

export interface StrategySuggestion {
  type: StrategyType;
  allocation: {
    pt: number; // 0-100 percentage
    yt: number; // 0-100 percentage
  };
  confidence: number; // 0-100 score
  reasoning: string;
  expectedReturn: {
    apy: number; // Annualized return
    absolute: number; // Dollar return for investment amount
    atMaturity: number; // Total value at maturity
  };
  risk: {
    level: 'low' | 'medium' | 'high';
    score: number; // 0-100
    factors: string[];
  };
  actionItems: string[];
}

export interface SuggestionInput {
  pool: PendlePool;
  investmentAmount: number;
  riskProfile: RiskProfile;
  // Optional: historical data for trend analysis
  apy7d?: number;
  apy30d?: number;
}

export interface PoolAnalysis {
  ptScore: number;
  ytScore: number;
  overallScore: number;
  marketSentiment: 'bullish' | 'neutral' | 'bearish';
  yieldTrend: 'rising' | 'stable' | 'falling';
  liquidityScore: number;
  maturityScore: number;
}

// ============================================================================
// Risk Profile Configurations
// ============================================================================

const RISK_CONFIGS: Record<RiskProfile, {
  ptBias: number;
  maxYtAllocation: number;
  volatilityTolerance: number;
  minLiquidityScore: number;
}> = {
  conservative: {
    ptBias: 0.3,        // 30% bonus to PT score
    maxYtAllocation: 30, // Max 30% in YT
    volatilityTolerance: 0.3,
    minLiquidityScore: 0.6,
  },
  moderate: {
    ptBias: 0,          // Neutral
    maxYtAllocation: 50, // Max 50% in YT
    volatilityTolerance: 0.5,
    minLiquidityScore: 0.4,
  },
  aggressive: {
    ptBias: -0.2,       // 20% bonus to YT score
    maxYtAllocation: 80, // Max 80% in YT
    volatilityTolerance: 0.8,
    minLiquidityScore: 0.2,
  },
};

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Analyze a pool's characteristics for strategy selection
 */
export function analyzePool(pool: PendlePool, apy7d?: number, apy30d?: number): PoolAnalysis {
  const currentApy = pool.apy / 100; // Convert to decimal
  const effectiveApy7d = apy7d ?? currentApy;
  const effectiveApy30d = apy30d ?? currentApy;

  // Calculate yield trend
  const apyChange = effectiveApy30d > 0
    ? (effectiveApy7d - effectiveApy30d) / effectiveApy30d
    : 0;

  let yieldTrend: 'rising' | 'stable' | 'falling';
  if (apyChange > 0.1) yieldTrend = 'rising';
  else if (apyChange < -0.1) yieldTrend = 'falling';
  else yieldTrend = 'stable';

  // PT Score: Based on discount and yield difference
  const discountScore = Math.min(pool.ptDiscount * 10, 1); // Normalize 0-10% discount to 0-1
  const yieldDiff = pool.impliedYield - currentApy;
  const yieldDiffScore = Math.max(0, Math.min(yieldDiff * 5, 1)); // Positive diff is good for PT
  const maturityFactor = pool.daysToMaturity > 30 && pool.daysToMaturity < 180 ? 1 : 0.7;

  const ptScore = (discountScore * 0.5 + yieldDiffScore * 0.3 + maturityFactor * 0.2) * 100;

  // YT Score: Based on APY and trend
  const apyScore = Math.min(currentApy * 2, 1); // 50% APY = max score
  const trendScore = yieldTrend === 'rising' ? 1 : yieldTrend === 'stable' ? 0.5 : 0.2;
  const lowDiscountBonus = pool.ptDiscount < 0.02 ? 1 : 0.7; // Low discount = good for YT

  const ytScore = (apyScore * 0.4 + trendScore * 0.4 + lowDiscountBonus * 0.2) * 100;

  // Liquidity Score
  const liquidityScore = Math.min(Math.log10(pool.tvl) / 7, 1); // $10M TVL = 1.0

  // Maturity Score (prefer 60-120 days)
  const optimalMaturity = 90;
  const maturityDeviation = Math.abs(pool.daysToMaturity - optimalMaturity) / optimalMaturity;
  const maturityScore = Math.max(0, 1 - maturityDeviation * 0.5);

  // Overall market sentiment
  let marketSentiment: 'bullish' | 'neutral' | 'bearish';
  if (ytScore > ptScore * 1.2) marketSentiment = 'bullish';
  else if (ptScore > ytScore * 1.2) marketSentiment = 'bearish';
  else marketSentiment = 'neutral';

  return {
    ptScore,
    ytScore,
    overallScore: (ptScore + ytScore) / 2,
    marketSentiment,
    yieldTrend,
    liquidityScore,
    maturityScore,
  };
}

/**
 * Calculate expected returns for a given allocation
 */
export function calculateExpectedReturns(
  pool: PendlePool,
  investmentAmount: number,
  ptAllocation: number,
  ytAllocation: number
): StrategySuggestion['expectedReturn'] {
  const ptAmount = investmentAmount * (ptAllocation / 100);
  const ytAmount = investmentAmount * (ytAllocation / 100);

  const daysToMaturity = pool.daysToMaturity;
  const yearsToMaturity = daysToMaturity / 365;
  const apy = pool.apy / 100;

  // PT Return: Buy at discount, redeem at $1
  const ptTokens = ptAmount / pool.ptPrice;
  const ptMaturityValue = ptTokens; // Each PT = $1 at maturity
  const ptReturn = ptMaturityValue - ptAmount;

  // YT Return: Collect yield over time (simplified model)
  const ytReturn = ytAmount * apy * yearsToMaturity;

  const totalReturn = ptReturn + ytReturn;
  const totalMaturityValue = ptMaturityValue + ytAmount + ytReturn;

  // Annualized APY
  const effectiveApy = yearsToMaturity > 0
    ? (totalReturn / investmentAmount) / yearsToMaturity
    : 0;

  return {
    apy: effectiveApy * 100,
    absolute: totalReturn,
    atMaturity: totalMaturityValue,
  };
}

/**
 * Assess risk for a given strategy
 */
export function assessRisk(
  pool: PendlePool,
  analysis: PoolAnalysis,
  ptAllocation: number,
  ytAllocation: number
): StrategySuggestion['risk'] {
  const factors: string[] = [];
  let riskScore = 0;

  // YT allocation increases risk
  const ytRisk = ytAllocation * 0.5; // YT is inherently riskier
  riskScore += ytRisk;
  if (ytAllocation > 50) {
    factors.push('High YT exposure - returns depend on yield stability');
  }

  // Long maturity increases risk
  if (pool.daysToMaturity > 180) {
    riskScore += 15;
    factors.push('Long time to maturity increases uncertainty');
  }

  // Low liquidity increases risk
  if (analysis.liquidityScore < 0.4) {
    riskScore += 20;
    factors.push('Lower liquidity may cause slippage');
  }

  // Falling yields increase YT risk
  if (analysis.yieldTrend === 'falling' && ytAllocation > 30) {
    riskScore += 15;
    factors.push('Declining yields reduce YT profitability');
  }

  // High APY can be unsustainable
  if (pool.apy > 30) {
    riskScore += 10;
    factors.push('Very high APY may not be sustainable');
  }

  // Add positive factors
  if (ptAllocation >= 70) {
    factors.push('Fixed returns from PT provide stability');
  }
  if (analysis.liquidityScore > 0.7) {
    factors.push('High liquidity ensures easy entry/exit');
  }

  // Normalize score
  riskScore = Math.min(Math.max(riskScore, 0), 100);

  let level: 'low' | 'medium' | 'high';
  if (riskScore < 30) level = 'low';
  else if (riskScore < 60) level = 'medium';
  else level = 'high';

  return {
    level,
    score: riskScore,
    factors,
  };
}

// ============================================================================
// Main Suggestion Engine
// ============================================================================

/**
 * Generate a strategy suggestion for a pool
 */
export function suggestStrategy(input: SuggestionInput): StrategySuggestion {
  const { pool, investmentAmount, riskProfile, apy7d, apy30d } = input;
  const config = RISK_CONFIGS[riskProfile];

  // Analyze the pool
  const analysis = analyzePool(pool, apy7d, apy30d);

  // Apply risk profile bias
  const adjustedPtScore = analysis.ptScore * (1 + config.ptBias);
  const adjustedYtScore = analysis.ytScore * (1 - config.ptBias);

  // Determine base allocation
  let ptAllocation: number;
  let ytAllocation: number;
  let strategyType: StrategyType;
  let reasoning: string;

  const scoreDiff = Math.abs(adjustedPtScore - adjustedYtScore);
  const totalScore = adjustedPtScore + adjustedYtScore;

  if (scoreDiff < 15 && analysis.liquidityScore >= config.minLiquidityScore) {
    // Balanced approach when scores are close
    strategyType = 'SPLIT';
    ptAllocation = Math.round(50 + (adjustedPtScore - adjustedYtScore) / 2);
    ytAllocation = 100 - ptAllocation;

    // Respect max YT allocation
    if (ytAllocation > config.maxYtAllocation) {
      ytAllocation = config.maxYtAllocation;
      ptAllocation = 100 - ytAllocation;
    }

    reasoning = `Market conditions favor a balanced approach. PT offers ${(pool.ptDiscount * 100).toFixed(1)}% discount while YT captures ${pool.apy.toFixed(1)}% APY.`;
  } else if (adjustedPtScore > adjustedYtScore) {
    // PT-heavy strategy
    strategyType = 'PT';
    const ptWeight = adjustedPtScore / totalScore;
    ptAllocation = Math.round(Math.min(ptWeight * 100, 95));
    ytAllocation = 100 - ptAllocation;

    reasoning = `PT strategy recommended due to ${(pool.ptDiscount * 100).toFixed(1)}% discount and ${pool.impliedYield.toFixed(1)}% implied yield. ${
      analysis.yieldTrend === 'falling' ? 'Declining yields make fixed PT returns more attractive.' : ''
    }`;
  } else {
    // YT-heavy strategy
    strategyType = 'YT';
    const ytWeight = adjustedYtScore / totalScore;
    ytAllocation = Math.round(Math.min(ytWeight * 100, config.maxYtAllocation));
    ptAllocation = 100 - ytAllocation;

    reasoning = `YT strategy shows potential with ${pool.apy.toFixed(1)}% APY. ${
      analysis.yieldTrend === 'rising' ? 'Rising yield trend supports YT holding.' : ''
    }`;
  }

  // Calculate expected returns
  const expectedReturn = calculateExpectedReturns(pool, investmentAmount, ptAllocation, ytAllocation);

  // Assess risk
  const risk = assessRisk(pool, analysis, ptAllocation, ytAllocation);

  // Generate action items
  const actionItems = generateActionItems(pool, analysis, strategyType, ptAllocation, ytAllocation);

  // Calculate confidence based on various factors
  const confidence = calculateConfidence(analysis, scoreDiff, risk);

  return {
    type: strategyType,
    allocation: { pt: ptAllocation, yt: ytAllocation },
    confidence,
    reasoning,
    expectedReturn,
    risk,
    actionItems,
  };
}

/**
 * Generate actionable recommendations
 */
function generateActionItems(
  pool: PendlePool,
  analysis: PoolAnalysis,
  strategyType: StrategyType,
  ptAllocation: number,
  ytAllocation: number
): string[] {
  const items: string[] = [];

  // Primary action
  if (strategyType === 'PT') {
    items.push(`Buy PT-${pool.symbol || pool.name} to lock in ${(pool.ptDiscount * 100).toFixed(1)}% discount`);
  } else if (strategyType === 'YT') {
    items.push(`Buy YT-${pool.symbol || pool.name} to capture ${pool.apy.toFixed(1)}% yield`);
  } else {
    items.push(`Split investment: ${ptAllocation}% PT, ${ytAllocation}% YT`);
  }

  // Maturity reminder
  items.push(`Hold until ${new Date(pool.maturity * 1000).toLocaleDateString()} for full returns`);

  // Risk management
  if (analysis.liquidityScore < 0.5) {
    items.push('Consider smaller position due to lower liquidity');
  }

  // Monitor advice
  if (ytAllocation > 30) {
    items.push('Monitor APY trends - consider reducing YT if yields decline');
  }

  // Early exit consideration
  if (pool.daysToMaturity > 90) {
    items.push('Review position at 30 days to maturity');
  }

  return items;
}

/**
 * Calculate confidence score for the suggestion
 */
function calculateConfidence(
  analysis: PoolAnalysis,
  scoreDiff: number,
  risk: StrategySuggestion['risk']
): number {
  let confidence = 50; // Base confidence

  // Higher score difference = more confidence in direction
  confidence += Math.min(scoreDiff * 0.5, 20);

  // Good liquidity increases confidence
  confidence += analysis.liquidityScore * 15;

  // Optimal maturity increases confidence
  confidence += analysis.maturityScore * 10;

  // Lower risk increases confidence
  confidence += (100 - risk.score) * 0.1;

  return Math.round(Math.min(Math.max(confidence, 20), 95));
}

// ============================================================================
// Comparison & Ranking
// ============================================================================

/**
 * Compare multiple pools and rank by strategy potential
 */
export function rankPoolsByStrategy(
  pools: PendlePool[],
  riskProfile: RiskProfile,
  investmentAmount: number = 1000
): Array<{ pool: PendlePool; suggestion: StrategySuggestion; rank: number }> {
  const ranked = pools
    .filter(pool => pool.daysToMaturity > 7)
    .map(pool => ({
      pool,
      suggestion: suggestStrategy({ pool, investmentAmount, riskProfile }),
    }))
    .sort((a, b) => {
      // Primary: confidence
      if (b.suggestion.confidence !== a.suggestion.confidence) {
        return b.suggestion.confidence - a.suggestion.confidence;
      }
      // Secondary: expected APY
      return b.suggestion.expectedReturn.apy - a.suggestion.expectedReturn.apy;
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return ranked;
}

/**
 * Get best pool for a specific strategy type
 */
export function getBestPoolForStrategy(
  pools: PendlePool[],
  strategyType: StrategyType,
  riskProfile: RiskProfile
): { pool: PendlePool; suggestion: StrategySuggestion } | null {
  const ranked = rankPoolsByStrategy(pools, riskProfile);

  const match = ranked.find(r => r.suggestion.type === strategyType);
  return match ? { pool: match.pool, suggestion: match.suggestion } : null;
}

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

export interface YieldData {
  ptPrice: number;
  apy7d: number;
  apy30d: number;
  maturityDays: number;
  sensitivity: number;
}

export interface RiskParams {
  maxDrawdown: number;
  volatility: number;
  riskProfile: RiskProfile;
}

export interface StrategyResult {
  ptPercentage: number;
  ytPercentage: number;
  comment: string;
  riskFactor?: number;
}

/**
 * @deprecated Use suggestStrategy instead
 */
export function calculatePTYTAllocation(data: YieldData): StrategyResult {
  const discount = 1 - data.ptPrice;
  const PT_score = discount * Math.sqrt(Math.max(data.maturityDays, 1) / 365);

  const apyTrend = data.apy30d > 0 ? (data.apy7d - data.apy30d) / data.apy30d : 0;
  let YT_score = Math.max(0, apyTrend * data.sensitivity);

  if (PT_score + YT_score === 0) {
    return { ptPercentage: 1, ytPercentage: 0, comment: 'No valid YT signal; allocate fully to PT', riskFactor: 0 };
  }

  const ptPercentage = PT_score / (PT_score + YT_score);
  const ytPercentage = YT_score / (PT_score + YT_score);

  let comment = '';
  if (ytPercentage > 0.7) comment = 'Strong YT signal (APY trending up)';
  else if (ytPercentage > 0.4) comment = 'Moderate YT allocation';
  else if (ytPercentage < 0.1) comment = 'Market weak; focus PT';
  else comment = 'Balanced PT/YT positioning';

  return { ptPercentage, ytPercentage, comment, riskFactor: 0 };
}

/**
 * @deprecated Use suggestStrategy instead
 */
export function calculatePTYTWithRisk(data: YieldData, risk: RiskParams): StrategyResult {
  const discount = 1 - data.ptPrice;
  const PT_score = discount * Math.sqrt(Math.max(data.maturityDays, 1) / 365);

  const apyTrend = data.apy30d > 0 ? (data.apy7d - data.apy30d) / data.apy30d : 0;
  let YT_score = Math.max(0, apyTrend * data.sensitivity);

  const MDD_norm = Math.min(risk.maxDrawdown / 0.3, 1);
  const vol_norm = Math.min(risk.volatility / 0.25, 1);
  const profileFactor = risk.riskProfile === 'conservative' ? 0.4 : risk.riskProfile === 'moderate' ? 0.7 : 1.0;

  const riskFactor = (1 - MDD_norm) * (1 - vol_norm) * profileFactor;
  const YT_adjusted = YT_score * riskFactor;

  if (PT_score + YT_adjusted === 0) {
    return { ptPercentage: 1, ytPercentage: 0, comment: 'YT suppressed by risk model', riskFactor };
  }

  const ptPercentage = PT_score / (PT_score + YT_adjusted);
  const ytPercentage = YT_adjusted / (PT_score + YT_adjusted);

  let comment = '';
  if (ytPercentage > 0.7) comment = 'Aggressive YT (trend strong + low risk)';
  else if (ytPercentage > 0.4) comment = 'Balanced allocation';
  else if (ytPercentage < 0.1) comment = 'Prefer PT (risk model suppresses YT)';
  else comment = 'Mild YT positioning';

  return { ptPercentage, ytPercentage, comment, riskFactor };
}

/**
 * @deprecated Use rankPoolsByStrategy instead
 */
export function scoreStablecoinPool(pool: {
  ptPrice: number;
  apy7d: number;
  apy30d: number;
  maturityDays: number;
  tvl: number;
  sensitivity: number;
  maxDrawdown: number;
  volatility: number;
  riskProfile: RiskProfile;
}): number {
  const result = calculatePTYTWithRisk(
    { ptPrice: pool.ptPrice, apy7d: pool.apy7d, apy30d: pool.apy30d, maturityDays: pool.maturityDays, sensitivity: pool.sensitivity },
    { maxDrawdown: pool.maxDrawdown, volatility: pool.volatility, riskProfile: pool.riskProfile }
  );

  const discount = 1 - pool.ptPrice;
  const ptScore = Math.min(discount / 0.15, 1);
  const trend = pool.apy30d > 0 ? (pool.apy7d - pool.apy30d) / pool.apy30d : 0;
  const trendScore = Math.min(Math.max(trend / 0.1, 0), 1);
  const maturityScore = Math.min(Math.max(1 - Math.abs((pool.maturityDays - 120) / 120), 0), 1);
  const tvlScore = Math.min(Math.log(pool.tvl) / Math.log(50_000_000), 1);

  return Math.round(30 * ptScore + 25 * trendScore + 20 * (result.riskFactor ?? 0) + 15 * maturityScore + 10 * tvlScore);
}
