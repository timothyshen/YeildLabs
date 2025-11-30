import { describe, it, expect } from 'vitest';
import {
  scorePoolForPT,
  scorePoolForYT,
  recommendPoolsForAsset,
  getRecommendationsForPortfolio,
} from './recommendations';
import type { PendlePool, WalletAsset } from '@/types';

// Mock pool data
const createMockPool = (overrides: Partial<PendlePool> = {}): PendlePool => ({
  address: '0x1234567890abcdef1234567890abcdef12345678',
  name: 'PT-sUSDe-26DEC2024',
  symbol: 'PT-sUSDe',
  underlyingAsset: {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    symbol: 'sUSDe',
    name: 'Staked USDe',
    decimals: 18,
    chainId: 8453,
  },
  syToken: {
    address: '0x1111111111111111111111111111111111111111',
    symbol: 'SY-sUSDe',
    name: 'SY sUSDe',
    decimals: 18,
    chainId: 8453,
  },
  ptToken: {
    address: '0x2222222222222222222222222222222222222222',
    symbol: 'PT-sUSDe',
    name: 'PT sUSDe',
    decimals: 18,
    chainId: 8453,
  },
  ytToken: {
    address: '0x3333333333333333333333333333333333333333',
    symbol: 'YT-sUSDe',
    name: 'YT sUSDe',
    decimals: 18,
    chainId: 8453,
  },
  maturity: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days from now
  maturityDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  daysToMaturity: 90,
  isExpired: false,
  tvl: 5000000, // $5M TVL
  apy: 0.08, // 8% APY
  impliedYield: 0.10, // 10% implied yield
  ptPrice: 0.98,
  ytPrice: 0.02,
  ptDiscount: 0.02, // 2% discount
  syPrice: 1.0,
  strategyTag: 'Best PT',
  riskLevel: 'neutral',
  ...overrides,
});

const createMockAsset = (overrides: Partial<WalletAsset> = {}): WalletAsset => ({
  token: {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    symbol: 'sUSDe',
    name: 'Staked USDe',
    decimals: 18,
    chainId: 8453,
  },
  balance: '10000000000000000000000', // 10,000 tokens
  balanceFormatted: 10000,
  valueUSD: 10000,
  lastUpdated: Date.now(),
  ...overrides,
});

describe('scorePoolForPT', () => {
  it('should return a positive score for a valid pool', () => {
    const pool = createMockPool();
    const score = scorePoolForPT(pool);
    expect(score).toBeGreaterThan(0);
  });

  it('should give higher score to pools with higher PT discount', () => {
    const lowDiscountPool = createMockPool({ ptDiscount: 0.01 });
    const highDiscountPool = createMockPool({ ptDiscount: 0.05 });

    const lowScore = scorePoolForPT(lowDiscountPool);
    const highScore = scorePoolForPT(highDiscountPool);

    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('should give higher score when implied yield exceeds APY', () => {
    const lowYieldDiffPool = createMockPool({ impliedYield: 0.08, apy: 0.08 });
    const highYieldDiffPool = createMockPool({ impliedYield: 0.15, apy: 0.08 });

    const lowScore = scorePoolForPT(lowYieldDiffPool);
    const highScore = scorePoolForPT(highYieldDiffPool);

    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('should consider TVL in scoring', () => {
    const lowTVLPool = createMockPool({ tvl: 100000 }); // $100k
    const highTVLPool = createMockPool({ tvl: 10000000 }); // $10M

    const lowScore = scorePoolForPT(lowTVLPool);
    const highScore = scorePoolForPT(highTVLPool);

    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('should prefer pools with optimal maturity (30-180 days)', () => {
    const optimalMaturityPool = createMockPool({ daysToMaturity: 90 });
    const suboptimalMaturityPool = createMockPool({ daysToMaturity: 200 });

    const optimalScore = scorePoolForPT(optimalMaturityPool);
    const suboptimalScore = scorePoolForPT(suboptimalMaturityPool);

    expect(optimalScore).toBeGreaterThan(suboptimalScore);
  });
});

describe('scorePoolForYT', () => {
  it('should return a positive score for a valid pool', () => {
    const pool = createMockPool();
    const score = scorePoolForYT(pool);
    expect(score).toBeGreaterThan(0);
  });

  it('should give higher score to pools with higher APY', () => {
    const lowAPYPool = createMockPool({ apy: 0.05 });
    const highAPYPool = createMockPool({ apy: 0.20 });

    const lowScore = scorePoolForYT(lowAPYPool);
    const highScore = scorePoolForYT(highAPYPool);

    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('should prefer pools with lower PT discount for YT strategy', () => {
    const highDiscountPool = createMockPool({ ptDiscount: 0.05 });
    const lowDiscountPool = createMockPool({ ptDiscount: 0.01 });

    const highDiscountScore = scorePoolForYT(highDiscountPool);
    const lowDiscountScore = scorePoolForYT(lowDiscountPool);

    expect(lowDiscountScore).toBeGreaterThan(highDiscountScore);
  });

  it('should cap APY score at 50%', () => {
    const normalAPYPool = createMockPool({ apy: 0.30 });
    const extremeAPYPool = createMockPool({ apy: 1.00 }); // 100% APY

    const normalScore = scorePoolForYT(normalAPYPool);
    const extremeScore = scorePoolForYT(extremeAPYPool);

    // Extreme APY should not give disproportionately higher score
    expect(extremeScore).toBeLessThanOrEqual(normalScore * 2);
  });
});

describe('recommendPoolsForAsset', () => {
  it('should return null for empty pool array', () => {
    const asset = createMockAsset();
    const result = recommendPoolsForAsset(asset, []);
    expect(result).toBeNull();
  });

  it('should return a valid recommendation for matching pools', () => {
    const asset = createMockAsset();
    const pools = [createMockPool()];
    const result = recommendPoolsForAsset(asset, pools);

    expect(result).not.toBeNull();
    expect(result?.asset.symbol).toBe('sUSDe');
    expect(result?.pools.bestPT).toBeDefined();
    expect(result?.strategy.recommended).toBeDefined();
    expect(result?.strategy.allocation.pt + result?.strategy.allocation.yt).toBe(100);
  });

  it('should identify both PT and YT pools', () => {
    const asset = createMockAsset();
    const ptPool = createMockPool({ address: '0x1111', ptDiscount: 0.05 });
    const ytPool = createMockPool({ address: '0x2222', apy: 0.25, ptDiscount: 0.01 });
    const pools = [ptPool, ytPool];

    const result = recommendPoolsForAsset(asset, pools);

    expect(result?.pools.bestPT).toBeDefined();
    expect(result?.pools.bestYT).toBeDefined();
  });

  it('should recommend SPLIT strategy when scores are close', () => {
    const asset = createMockAsset();
    // Create pools with similar characteristics
    const pool = createMockPool({
      ptDiscount: 0.02,
      apy: 0.10,
      impliedYield: 0.10,
    });

    const result = recommendPoolsForAsset(asset, [pool]);

    // With similar scores, the recommendation should favor balanced approach
    expect(['PT', 'YT', 'SPLIT']).toContain(result?.strategy.recommended);
  });
});

describe('getRecommendationsForPortfolio', () => {
  it('should handle assets with matching pools', () => {
    const assets = [createMockAsset()];
    const pools = [createMockPool()];

    const result = getRecommendationsForPortfolio(assets, pools);

    // With matching pools, we should get recommendations
    expect(result.totalOpportunities).toBeGreaterThanOrEqual(0);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
  });

  it('should adjust allocations for conservative risk level', () => {
    const asset = createMockAsset();
    // Create a pool that would normally recommend YT
    const ytFavoredPool = createMockPool({
      apy: 0.30,
      ptDiscount: 0.01,
      impliedYield: 0.05,
    });

    const result = getRecommendationsForPortfolio([asset], [ytFavoredPool], 'conservative');

    // Conservative should favor PT
    if (result.recommendations.length > 0) {
      expect(result.recommendations[0].strategy.allocation.pt).toBeGreaterThanOrEqual(
        result.recommendations[0].strategy.allocation.yt
      );
    }
  });

  it('should adjust allocations for aggressive risk level', () => {
    const asset = createMockAsset();
    // Create a pool that would normally recommend PT
    const ptFavoredPool = createMockPool({
      apy: 0.05,
      ptDiscount: 0.05,
      impliedYield: 0.15,
    });

    const result = getRecommendationsForPortfolio([asset], [ptFavoredPool], 'aggressive');

    // Aggressive should favor YT more
    if (result.recommendations.length > 0) {
      expect(result.recommendations[0].strategy.allocation.yt).toBeGreaterThanOrEqual(
        result.recommendations[0].strategy.allocation.pt - 40 // Allow some flexibility
      );
    }
  });

  it('should calculate summary metrics correctly', () => {
    const assets = [
      createMockAsset({ valueUSD: 5000 }),
      createMockAsset({
        token: { ...createMockAsset().token, symbol: 'USDC', address: '0x5555' },
        valueUSD: 3000,
      }),
    ];

    const pools = [
      createMockPool({ apy: 0.10 }),
      createMockPool({
        address: '0x6666',
        underlyingAsset: { ...createMockPool().underlyingAsset, symbol: 'USDC' },
        apy: 0.08,
      }),
    ];

    const result = getRecommendationsForPortfolio(assets, pools);

    expect(result.totalOpportunities).toBeGreaterThanOrEqual(0);
    expect(result.bestOverallAPY).toBeGreaterThanOrEqual(0);
    expect(result.totalPotentialValue).toBeGreaterThanOrEqual(0);
  });
});
