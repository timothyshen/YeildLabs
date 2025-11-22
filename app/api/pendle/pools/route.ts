import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, PendlePool } from '@/types';
import { fetchMarkets, fetchPools } from '@/lib/pendle/apiClient';
import { BASE_CHAIN_ID, isSupportedStablecoin } from '@/lib/pendle/config';

/**
 * Pendle Pools API
 * Fetches available Pendle pools with PT/YT data from Pendle API
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stablecoinOnly = searchParams.get('stablecoin') === 'true';

    // Try to fetch from Pendle API
    let markets;
    let pools;
    
    try {
      // Fetch markets from Pendle API
      markets = await fetchMarkets(BASE_CHAIN_ID);
      console.log('✅ Fetched markets from Pendle API:', Array.isArray(markets) ? markets.length : 'invalid response');
      
      // Fetch pools if available
      try {
        pools = await fetchPools(BASE_CHAIN_ID);
        console.log('✅ Fetched pools from Pendle API:', Array.isArray(pools) ? pools.length : 'invalid response');
      } catch (poolError) {
        console.warn('⚠️ Could not fetch pools, using markets only:', poolError);
        pools = null;
      }
    } catch (apiError) {
      console.warn('⚠️ Pendle API not available, using mock data:', apiError);
      // Fall back to mock data if API fails
      markets = null;
      pools = null;
    }

    // If API data is available, transform it
    if (markets && Array.isArray(markets) && markets.length > 0) {
      const transformedPools = transformMarketsToPools(markets, pools);
      
      const filteredPools = stablecoinOnly
        ? transformedPools.filter(pool => isSupportedStablecoin(pool.underlyingAsset))
        : transformedPools;

      return NextResponse.json<ApiResponse<PendlePool[]>>({
        success: true,
        data: filteredPools,
      });
    }

    // Fallback to mock data
    console.log('📦 Using mock pool data');
    const mockPools: PendlePool[] = [
      {
        address: '0x1234567890123456789012345678901234567890',
        name: 'PT-sUSDe-26DEC2024',
        symbol: 'PT-sUSDe',
        underlyingAsset: 'sUSDe',
        maturity: Math.floor(new Date('2024-12-26').getTime() / 1000),
        tvl: 52000000,
        apy: 15.8,
        impliedYield: 16.5,
        ptPrice: 0.973,
        ytPrice: 0.027,
        ptDiscount: 0.027,
        daysToMaturity: 34,
        strategyTag: 'Best PT',
      },
      {
        address: '0x2345678901234567890123456789012345678901',
        name: 'PT-USDC-29JAN2025',
        symbol: 'PT-USDC',
        underlyingAsset: 'USDC',
        maturity: Math.floor(new Date('2025-01-29').getTime() / 1000),
        tvl: 38500000,
        apy: 12.3,
        impliedYield: 13.1,
        ptPrice: 0.985,
        ytPrice: 0.015,
        ptDiscount: 0.015,
        daysToMaturity: 68,
        strategyTag: 'Neutral',
      },
      {
        address: '0x3456789012345678901234567890123456789012',
        name: 'PT-USD0++-27FEB2025',
        symbol: 'PT-USD0++',
        underlyingAsset: 'USD0++',
        maturity: Math.floor(new Date('2025-02-27').getTime() / 1000),
        tvl: 15200000,
        apy: 22.5,
        impliedYield: 24.8,
        ptPrice: 0.945,
        ytPrice: 0.055,
        ptDiscount: 0.055,
        daysToMaturity: 97,
        strategyTag: 'Best YT',
      },
      {
        address: '0x4567890123456789012345678901234567890123',
        name: 'PT-fUSD-30MAR2025',
        symbol: 'PT-fUSD',
        underlyingAsset: 'fUSD',
        maturity: Math.floor(new Date('2025-03-30').getTime() / 1000),
        tvl: 8900000,
        apy: 18.7,
        impliedYield: 19.2,
        ptPrice: 0.962,
        ytPrice: 0.038,
        ptDiscount: 0.038,
        daysToMaturity: 128,
        strategyTag: 'Best PT',
      },
      {
        address: '0x5678901234567890123456789012345678901234',
        name: 'PT-cUSD-25APR2025',
        symbol: 'PT-cUSD',
        underlyingAsset: 'cUSD',
        maturity: Math.floor(new Date('2025-04-25').getTime() / 1000),
        tvl: 6200000,
        apy: 28.3,
        impliedYield: 31.5,
        ptPrice: 0.912,
        ytPrice: 0.088,
        ptDiscount: 0.088,
        daysToMaturity: 154,
        strategyTag: 'Risky',
      },
      {
        address: '0x6789012345678901234567890123456789012345',
        name: 'PT-sKAITO-15MAY2025',
        symbol: 'PT-sKAITO',
        underlyingAsset: 'sKAITO',
        maturity: Math.floor(new Date('2025-05-15').getTime() / 1000),
        tvl: 3800000,
        apy: 35.6,
        impliedYield: 38.9,
        ptPrice: 0.889,
        ytPrice: 0.111,
        ptDiscount: 0.111,
        daysToMaturity: 174,
        strategyTag: 'Risky',
      },
    ];

    const filteredPools = stablecoinOnly
      ? mockPools.filter(pool =>
          ['USDC', 'sUSDe', 'cUSD', 'USD0++', 'fUSD'].includes(pool.underlyingAsset)
        )
      : mockPools;

    return NextResponse.json<ApiResponse<PendlePool[]>>({
      success: true,
      data: filteredPools,
    });
  } catch (error) {
    console.error('Pendle API error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Pendle pools',
    }, { status: 500 });
  }
}

/**
 * Transform Pendle API market data to our unified pool format
 * This will be refined once we see the actual API response structure
 */
function transformMarketsToPools(
  markets: any[],
  poolsData: any[] | null
): PendlePool[] {
  return markets.map((market, index) => {
    // Extract data from market object
    // Structure will be adjusted based on actual API response
    const maturity = market.maturity || market.expiry || 0;
    const now = Date.now() / 1000;
    const daysToMaturity = maturity > now ? Math.ceil((maturity - now) / 86400) : 0;

    // Try to get pool data if available
    const poolData = poolsData?.find((p: any) => 
      p.market === market.address || p.address === market.address
    );

    // Calculate prices and yields (will need actual API data)
    const ptPrice = market.ptPrice || poolData?.ptPrice || 0.95;
    const ytPrice = market.ytPrice || poolData?.ytPrice || 0.05;
    const apy = market.apy || poolData?.apy || market.underlyingApy || 12;
    const impliedYield = market.impliedYield || market.impliedApy || apy * 1.05;
    const tvl = parseFloat(market.tvl || poolData?.tvl || '0') || 0;

    // Calculate strategy tag
    const ptDiscount = 1 - ptPrice;
    const strategyTag = calculateStrategyTag(apy, impliedYield, ptDiscount, daysToMaturity);

    return {
      address: market.address || market.market || `market-${index}`,
      name: market.name || market.symbol || `PT-${market.underlyingAsset || 'UNKNOWN'}`,
      symbol: market.symbol || market.name || 'PT',
      underlyingAsset: market.underlyingAsset || market.underlying || 'UNKNOWN',
      maturity,
      tvl,
      apy,
      impliedYield,
      ptPrice,
      ytPrice,
      ptDiscount,
      daysToMaturity,
      strategyTag,
    };
  });
}

/**
 * Calculate strategy tag based on pool metrics
 */
function calculateStrategyTag(
  apy: number,
  impliedYield: number,
  ptDiscount: number,
  daysToMaturity: number
): 'Best PT' | 'Best YT' | 'Risky' | 'Neutral' {
  const yieldDiff = impliedYield - apy;
  const discountPercent = ptDiscount * 100;

  // Best PT: High discount, implied yield significantly higher than APY
  if (discountPercent > 3 && yieldDiff > 1) {
    return 'Best PT';
  }

  // Best YT: High APY, low discount, potential for APY growth
  if (apy > 20 && discountPercent < 2 && daysToMaturity > 60) {
    return 'Best YT';
  }

  // Risky: Very high APY or very high discount (volatility risk)
  if (apy > 30 || discountPercent > 10) {
    return 'Risky';
  }

  return 'Neutral';
}
