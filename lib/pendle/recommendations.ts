/**
 * Pendle Pool Recommendation Engine
 *
 * Scores and ranks Pendle pools based on user assets and risk preferences.
 * Integrates with the Strategy Suggestion Engine for intelligent recommendations.
 */

import type { WalletAsset, PendlePool } from '@/types';
import { findMatchingPools } from './assetMatcher';
import {
  suggestStrategy,
  analyzePool,
  rankPoolsByStrategy,
  type RiskProfile,
  type StrategySuggestion,
  type PoolAnalysis,
} from './strategy';

// ============================================================================
// Types
// ============================================================================

export interface PoolRecommendation {
  asset: {
    symbol: string;
    balance: number;
    valueUSD: number;
  };
  pools: {
    bestPT?: PendlePool;
    bestYT?: PendlePool;
    alternatives: PendlePool[];
  };
  strategy: {
    recommended: 'PT' | 'YT' | 'SPLIT';
    allocation: { pt: number; yt: number };
    expectedAPY: number;
    reasoning: string;
    riskLevel?: 'low' | 'medium' | 'high';
    confidence?: number;
    actionItems?: string[];
  };
  // New: detailed analysis from suggestion engine
  analysis?: PoolAnalysis;
  suggestion?: StrategySuggestion;
}

export interface RecommendationSummary {
  totalOpportunities: number;
  bestOverallAPY: number;
  totalPotentialValue: number;
  recommendations: PoolRecommendation[];
  // New: ranked pools across all assets
  topPools?: Array<{ pool: PendlePool; suggestion: StrategySuggestion; rank: number }>;
}

// ============================================================================
// Scoring Functions (kept for backward compatibility with tests)
// ============================================================================

/**
 * Score a pool for PT (Principal Token) strategy
 * Higher score = better for PT
 */
export function scorePoolForPT(pool: PendlePool): number {
  const discountScore = pool.ptDiscount * 100;
  const yieldDiff = pool.impliedYield - pool.apy;
  const tvlScore = Math.min((pool.tvl / 1000000) * 10, 100);
  const maturityScore = pool.daysToMaturity > 30 && pool.daysToMaturity < 180 ? 100 : 50;

  return (
    discountScore * 0.4 +
    Math.max(0, yieldDiff * 3) * 0.3 +
    tvlScore * 0.2 +
    maturityScore * 0.1
  );
}

/**
 * Score a pool for YT (Yield Token) strategy
 * Higher score = better for YT
 */
export function scorePoolForYT(pool: PendlePool): number {
  const apyScore = Math.min(pool.apy, 50);
  const discountScore = pool.ptDiscount < 0.02 ? 100 : 50;
  const tvlScore = Math.min((pool.tvl / 1000000) * 10, 100);
  const maturityScore = pool.daysToMaturity > 60 ? 100 : 50;

  return (
    apyScore * 0.4 +
    discountScore * 0.3 +
    tvlScore * 0.2 +
    maturityScore * 0.1
  );
}

// ============================================================================
// Core Recommendation Functions
// ============================================================================

/**
 * Map risk level string to RiskProfile type
 */
function mapRiskLevel(level: 'conservative' | 'neutral' | 'aggressive'): RiskProfile {
  if (level === 'conservative') return 'conservative';
  if (level === 'aggressive') return 'aggressive';
  return 'moderate';
}

/**
 * Get best recommendations for a single asset using the suggestion engine
 */
export function recommendPoolsForAsset(
  asset: WalletAsset,
  matchingPools: PendlePool[],
  riskProfile: RiskProfile = 'moderate'
): PoolRecommendation | null {
  if (matchingPools.length === 0) {
    return null;
  }

  // Extract asset info (handle both unified and legacy formats)
  const assetSymbol = (asset.token as any)?.symbol || (asset as any).symbol || 'UNKNOWN';
  const assetBalance = (asset as any).balanceFormatted || parseFloat(String(asset.balance || '0')) || (asset as any).balance || 0;
  const assetValue = asset.valueUSD || 0;

  // Use suggestion engine to analyze each pool
  const poolsWithSuggestions = matchingPools.map((pool) => {
    const suggestion = suggestStrategy({
      pool,
      investmentAmount: assetValue || 1000,
      riskProfile,
    });
    const analysis = analyzePool(pool);
    return { pool, suggestion, analysis };
  });

  // Find best PT pool (highest PT allocation suggestion)
  const bestPTResult = [...poolsWithSuggestions]
    .sort((a, b) => b.suggestion.allocation.pt - a.suggestion.allocation.pt)[0];

  // Find best YT pool (highest YT allocation suggestion)
  const bestYTResult = [...poolsWithSuggestions]
    .sort((a, b) => b.suggestion.allocation.yt - a.suggestion.allocation.yt)[0];

  // Find overall best pool (highest confidence)
  const bestOverall = [...poolsWithSuggestions]
    .sort((a, b) => b.suggestion.confidence - a.suggestion.confidence)[0];

  // Get alternatives (excluding best PT and YT)
  const alternatives = poolsWithSuggestions
    .filter((p) =>
      p.pool.address !== bestPTResult?.pool.address &&
      p.pool.address !== bestYTResult?.pool.address
    )
    .sort((a, b) => b.suggestion.confidence - a.suggestion.confidence)
    .map((p) => p.pool)
    .slice(0, 3);

  // Use the best overall suggestion for strategy
  const primarySuggestion = bestOverall.suggestion;

  return {
    asset: {
      symbol: assetSymbol,
      balance: assetBalance,
      valueUSD: assetValue,
    },
    pools: {
      bestPT: bestPTResult?.pool,
      bestYT: bestYTResult?.pool,
      alternatives,
    },
    strategy: {
      recommended: primarySuggestion.type,
      allocation: primarySuggestion.allocation,
      expectedAPY: primarySuggestion.expectedReturn.apy,
      reasoning: primarySuggestion.reasoning,
      riskLevel: primarySuggestion.risk.level,
      confidence: primarySuggestion.confidence,
      actionItems: primarySuggestion.actionItems,
    },
    analysis: bestOverall.analysis,
    suggestion: primarySuggestion,
  };
}

/**
 * Get recommendations for all user assets
 */
export function getRecommendationsForPortfolio(
  userAssets: WalletAsset[],
  allPools: PendlePool[],
  riskLevel: 'conservative' | 'neutral' | 'aggressive' = 'neutral'
): RecommendationSummary {
  const riskProfile = mapRiskLevel(riskLevel);

  // Find matching pools for each asset
  const matches = findMatchingPools(userAssets, allPools);

  // Generate recommendations for each asset
  const recommendations: PoolRecommendation[] = [];

  userAssets.forEach((asset) => {
    const assetSymbol = ((asset.token as any)?.symbol || (asset as any).symbol || '').toUpperCase();
    const matchingPools = matches.get(assetSymbol) || [];

    if (matchingPools.length > 0) {
      const recommendation = recommendPoolsForAsset(asset, matchingPools, riskProfile);

      if (recommendation) {
        // Apply risk-based adjustments for backward compatibility
        if (riskLevel === 'conservative' && recommendation.strategy.recommended === 'YT') {
          recommendation.strategy.recommended = 'SPLIT';
          recommendation.strategy.allocation = { pt: 70, yt: 30 };
        } else if (riskLevel === 'aggressive' && recommendation.strategy.recommended === 'PT') {
          recommendation.strategy.recommended = 'SPLIT';
          recommendation.strategy.allocation = { pt: 30, yt: 70 };
        }

        recommendations.push(recommendation);
      }
    }
  });

  // Calculate summary
  const totalOpportunities = recommendations.length;
  const bestOverallAPY = recommendations.length > 0
    ? Math.max(...recommendations.map((r) => r.strategy.expectedAPY))
    : 0;
  const totalPotentialValue = recommendations.reduce(
    (sum, r) => sum + r.asset.valueUSD,
    0
  );

  // Get top pools across all assets
  const topPools = rankPoolsByStrategy(allPools, riskProfile, 1000).slice(0, 5);

  return {
    totalOpportunities,
    bestOverallAPY,
    totalPotentialValue,
    recommendations,
    topPools,
  };
}

// ============================================================================
// New Enhanced Functions
// ============================================================================

/**
 * Get a quick suggestion for a specific pool
 */
export function getPoolSuggestion(
  pool: PendlePool,
  investmentAmount: number = 1000,
  riskProfile: RiskProfile = 'moderate'
): StrategySuggestion {
  return suggestStrategy({ pool, investmentAmount, riskProfile });
}

/**
 * Compare multiple pools and get ranked suggestions
 */
export function comparePoolStrategies(
  pools: PendlePool[],
  investmentAmount: number = 1000,
  riskProfile: RiskProfile = 'moderate'
): Array<{ pool: PendlePool; suggestion: StrategySuggestion; rank: number }> {
  return rankPoolsByStrategy(pools, riskProfile, investmentAmount);
}

/**
 * Get the best opportunity from a list of pools
 */
export function getBestOpportunity(
  pools: PendlePool[],
  riskProfile: RiskProfile = 'moderate'
): { pool: PendlePool; suggestion: StrategySuggestion } | null {
  const ranked = rankPoolsByStrategy(pools, riskProfile);
  return ranked.length > 0 ? { pool: ranked[0].pool, suggestion: ranked[0].suggestion } : null;
}

/**
 * Get strategy distribution summary for a portfolio
 */
export function getPortfolioStrategyDistribution(
  recommendations: PoolRecommendation[]
): {
  ptHeavy: number;
  ytHeavy: number;
  balanced: number;
  avgPtAllocation: number;
  avgYtAllocation: number;
} {
  if (recommendations.length === 0) {
    return { ptHeavy: 0, ytHeavy: 0, balanced: 0, avgPtAllocation: 0, avgYtAllocation: 0 };
  }

  let ptHeavy = 0;
  let ytHeavy = 0;
  let balanced = 0;
  let totalPt = 0;
  let totalYt = 0;

  recommendations.forEach((rec) => {
    const { pt, yt } = rec.strategy.allocation;
    totalPt += pt;
    totalYt += yt;

    if (pt >= 70) ptHeavy++;
    else if (yt >= 70) ytHeavy++;
    else balanced++;
  });

  return {
    ptHeavy,
    ytHeavy,
    balanced,
    avgPtAllocation: Math.round(totalPt / recommendations.length),
    avgYtAllocation: Math.round(totalYt / recommendations.length),
  };
}
