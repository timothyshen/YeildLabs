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
      // Note: The /v1/{chainId}/markets/active endpoint returns basic market info
      // We may need to fetch additional details from /v2/{chainId}/markets/{address}/data
      // for full APY/TVL data. For now, we'll use what we have.
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
 * 
 * MarketInfo structure from /v1/{chainId}/markets/active:
 * {
 *   name: string
 *   address: string (market address)
 *   expiry: string (ISO date)
 *   pt: string (chainId-address format, e.g., "8453-0x...")
 *   yt: string (chainId-address format)
 *   sy: string (chainId-address format)
 *   underlyingAsset: string (chainId-address format)
 * }
 * 
 * Note: The active markets endpoint returns basic info.
 * For full details (TVL, APY), we may need to call /v2/{chainId}/markets/{address}/data
 * For now, we'll use reasonable defaults and calculate from expiry.
 */
export function transformMarketsToPools(
  markets: any[],
  poolsData: any[] | null
): PendlePool[] {
  return markets
    .filter((market) => market.address && market.expiry) // Only include valid markets
    .map((market) => {
      // Parse expiry date
      const expiryDate = market.expiry ? new Date(market.expiry) : null;
      const maturity = expiryDate ? Math.floor(expiryDate.getTime() / 1000) : 0;
      const now = Date.now() / 1000;
      const daysToMaturity = maturity > now ? Math.ceil((maturity - now) / 86400) : 0;

      // Extract underlying asset address (remove chainId prefix if present)
      const underlyingAssetAddress = market.underlyingAsset 
        ? market.underlyingAsset.split('-').pop() || market.underlyingAsset
        : 'UNKNOWN';

      // Try to get detailed data from poolsData if available
      const poolData = poolsData?.find((p: any) => 
        p.market === market.address || p.address === market.address
      );

      // Extract APY data (from details if available, otherwise use defaults)
      const details = market.details || poolData?.details || {};
      const underlyingApy = details.underlyingApy || 0;
      const impliedApy = details.impliedApy || 0;
      const aggregatedApy = details.aggregatedApy || underlyingApy;
      
      // Use aggregatedApy as the main APY, fallback to reasonable default
      const apy = aggregatedApy > 0 ? aggregatedApy : (underlyingApy > 0 ? underlyingApy : 0.10); // 10% default
      const impliedYield = impliedApy > 0 ? impliedApy : (apy * 1.05);

      // Extract TVL
      const tvl = details.totalTvl || details.liquidity || poolData?.tvl || 0;

      // Extract underlying asset symbol from name if possible
      // Market names often follow pattern like "PT-sUSDe-26DEC2024" or "sUSDe"
      let underlyingAsset = 'UNKNOWN';
      if (market.name) {
        // Try to extract asset name from market name
        const nameParts = market.name.split('-');
        if (nameParts.length > 1 && nameParts[0] === 'PT') {
          underlyingAsset = nameParts[1];
        } else {
          underlyingAsset = nameParts[0];
        }
      }

      // Calculate PT/YT prices from implied yield
      // PT price approximates: 1 - (impliedYield * daysToMaturity / 365)
      // YT price approximates: impliedYield * daysToMaturity / 365
      const timeFactor = daysToMaturity / 365;
      const ptPrice = impliedYield > 0 && daysToMaturity > 0
        ? Math.max(0.5, Math.min(1, 1 - (impliedYield * timeFactor)))
        : 0.95;
      const ytPrice = impliedYield > 0 && daysToMaturity > 0
        ? Math.max(0, Math.min(0.5, impliedYield * timeFactor))
        : 0.05;
      
      const ptDiscount = 1 - ptPrice;

      // Calculate strategy tag
      const strategyTag = calculateStrategyTag(apy, impliedYield, ptDiscount, daysToMaturity);

      return {
        address: market.address,
        name: market.name || `PT-${underlyingAsset}`,
        symbol: market.name || `PT-${underlyingAsset}`,
        underlyingAsset: underlyingAsset,
        maturity,
        tvl,
        apy: apy * 100, // Convert to percentage
        impliedYield: impliedYield * 100, // Convert to percentage
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
