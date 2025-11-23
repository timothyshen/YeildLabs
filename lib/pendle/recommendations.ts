/**
 * Pendle Pool Recommendation Engine
 * 
 * Scores and ranks Pendle pools based on user assets and risk preferences
 */

import type { WalletAsset, PendlePool } from '@/types';
import { findMatchingPools } from './assetMatcher';

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
  };
}

export interface RecommendationSummary {
  totalOpportunities: number;
  bestOverallAPY: number;
  totalPotentialValue: number;
  recommendations: PoolRecommendation[];
}

/**
 * Score a pool for PT (Principal Token) strategy
 * Higher score = better for PT
 */
export function scorePoolForPT(pool: PendlePool): number {
  const discountScore = pool.ptDiscount * 100; // 0-100 based on discount
  const yieldDiff = pool.impliedYield - pool.apy; // Positive is good
  const tvlScore = Math.min((pool.tvl / 1000000) * 10, 100); // Normalize TVL
  const maturityScore = pool.daysToMaturity > 30 && pool.daysToMaturity < 180 ? 100 : 50;

  // Weighted scoring
  return (
    discountScore * 0.4 + // 40% weight on discount
    Math.max(0, yieldDiff * 3) * 0.3 + // 30% weight on yield difference
    tvlScore * 0.2 + // 20% weight on TVL
    maturityScore * 0.1 // 10% weight on maturity timing
  );
}

/**
 * Score a pool for YT (Yield Token) strategy
 * Higher score = better for YT
 */
export function scorePoolForYT(pool: PendlePool): number {
  const apyScore = Math.min(pool.apy, 50); // Cap at 50% APY
  const discountScore = pool.ptDiscount < 0.02 ? 100 : 50; // Low discount = good for YT
  const tvlScore = Math.min((pool.tvl / 1000000) * 10, 100);
  const maturityScore = pool.daysToMaturity > 60 ? 100 : 50;

  // Weighted scoring
  return (
    apyScore * 0.4 + // 40% weight on APY
    discountScore * 0.3 + // 30% weight on discount (low is good)
    tvlScore * 0.2 + // 20% weight on TVL
    maturityScore * 0.1 // 10% weight on maturity timing
  );
}

/**
 * Get best recommendations for a single asset
 */
export function recommendPoolsForAsset(
  asset: WalletAsset,
  matchingPools: PendlePool[]
): PoolRecommendation | null {
  if (matchingPools.length === 0) {
    return null;
  }

  // Score all pools for PT and YT strategies
  const scoredPools = matchingPools.map((pool) => ({
    pool,
    ptScore: scorePoolForPT(pool),
    ytScore: scorePoolForYT(pool),
  }));

  // Find best PT pool
  const bestPT = scoredPools
    .sort((a, b) => b.ptScore - a.ptScore)[0]?.pool;

  // Find best YT pool
  const bestYT = scoredPools
    .sort((a, b) => b.ytScore - a.ytScore)[0]?.pool;

  // Get alternatives (other pools sorted by combined score)
  const alternatives = scoredPools
    .filter((sp) => sp.pool.address !== bestPT?.address && sp.pool.address !== bestYT?.address)
    .sort((a, b) => (b.ptScore + b.ytScore) - (a.ptScore + a.ytScore))
    .map((sp) => sp.pool)
    .slice(0, 3); // Top 3 alternatives

  // Determine recommended strategy
  const ptScore = bestPT ? scorePoolForPT(bestPT) : 0;
  const ytScore = bestYT ? scorePoolForYT(bestYT) : 0;
  const scoreDiff = Math.abs(ptScore - ytScore);

  let recommended: 'PT' | 'YT' | 'SPLIT';
  let allocation: { pt: number; yt: number };
  let expectedAPY: number;
  let reasoning: string;

  if (scoreDiff < 10) {
    // Scores are close, recommend split
    recommended = 'SPLIT';
    allocation = { pt: 50, yt: 50 };
    expectedAPY = ((bestPT?.apy || 0) + (bestYT?.apy || 0)) / 2;
    reasoning = 'Both PT and YT strategies show similar potential. A balanced split provides diversification.';
  } else if (ptScore > ytScore) {
    // PT is better
    recommended = 'PT';
    allocation = { pt: 80, yt: 20 };
    expectedAPY = bestPT?.apy || 0;
    reasoning = `PT strategy offers better value with ${(bestPT?.ptDiscount || 0) * 100}% discount and implied yield of ${bestPT?.impliedYield?.toFixed(2)}%.`;
  } else {
    // YT is better
    recommended = 'YT';
    allocation = { pt: 20, yt: 80 };
    expectedAPY = bestYT?.apy || 0;
    reasoning = `YT strategy offers higher APY (${bestYT?.apy?.toFixed(2)}%) with good liquidity and maturity timing.`;
  }

  // Extract asset info (handle both unified and legacy formats)
  const assetSymbol = (asset.token as any)?.symbol || (asset as any).symbol || 'UNKNOWN';
  const assetBalance = (asset as any).balanceFormatted || parseFloat(String(asset.balance || '0')) || (asset as any).balance || 0;
  const assetValue = asset.valueUSD || 0;

  return {
    asset: {
      symbol: assetSymbol,
      balance: assetBalance,
      valueUSD: assetValue,
    },
    pools: {
      bestPT,
      bestYT,
      alternatives,
    },
    strategy: {
      recommended,
      allocation,
      expectedAPY,
      reasoning,
    },
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
  // Find matching pools for each asset
  const matches = findMatchingPools(userAssets, allPools);

  // Generate recommendations for each asset
  const recommendations: PoolRecommendation[] = [];

  userAssets.forEach((asset) => {
    // Handle both legacy and unified WalletAsset structure
    const assetSymbol = ((asset.token as any)?.symbol || (asset as any).symbol || '').toUpperCase();
    const matchingPools = matches.get(assetSymbol) || [];

    if (matchingPools.length > 0) {
      const recommendation = recommendPoolsForAsset(asset, matchingPools);

      if (recommendation) {
        // Adjust based on risk level
        if (riskLevel === 'conservative') {
          // Favor PT strategy
          if (recommendation.strategy.recommended === 'YT') {
            recommendation.strategy.recommended = 'SPLIT';
            recommendation.strategy.allocation = { pt: 70, yt: 30 };
          } else if (recommendation.strategy.recommended === 'SPLIT') {
            recommendation.strategy.allocation = { pt: 70, yt: 30 };
          }
        } else if (riskLevel === 'aggressive') {
          // Favor YT strategy
          if (recommendation.strategy.recommended === 'PT') {
            recommendation.strategy.recommended = 'SPLIT';
            recommendation.strategy.allocation = { pt: 30, yt: 70 };
          } else if (recommendation.strategy.recommended === 'SPLIT') {
            recommendation.strategy.allocation = { pt: 30, yt: 70 };
          }
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

  return {
    totalOpportunities,
    bestOverallAPY,
    totalPotentialValue,
    recommendations,
  };
}

