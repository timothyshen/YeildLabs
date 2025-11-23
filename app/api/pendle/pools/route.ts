import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, PendlePool } from '@/types';
import { fetchMarkets, fetchPools, fetchMarketDetails } from '@/lib/pendle/apiClient';
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
      console.error('❌ Pendle API error:', apiError);
      throw apiError; // Don't fall back to mock data
    }

    // If API data is available, transform it
    if (markets && Array.isArray(markets) && markets.length > 0) {
      // Markets from /core/v1/{chainId}/markets/active already include details object
      // No need to fetch additional details unless we want more granular data
      const transformedPools = transformMarketsToPools(markets, pools);
      
      const filteredPools = stablecoinOnly
        ? transformedPools.filter(pool => isSupportedStablecoin(pool.underlyingAsset))
        : transformedPools;

      return NextResponse.json<ApiResponse<PendlePool[]>>({
        success: true,
        data: filteredPools,
      });
    }

    // No API data available - return error
    console.error('❌ No markets found from Pendle API');
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'No Pendle markets found. Please check the API connection.',
    }, { status: 503 });
  } catch (error) {
    console.error('❌ Pendle API error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Pendle pools from API',
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

      // Try to get detailed data from poolsData if available
      const poolData = poolsData?.find((p: any) => 
        p.market === market.address || p.address === market.address
      );

      // Extract APY data from details object (already included in API response)
      const details = market.details || poolData?.details || {};
      
      // Get APY data from details object
      // The API provides: aggregatedApy, maxBoostedApy, impliedApy, pendleApy
      const aggregatedApy = details.aggregatedApy || 0;
      const maxBoostedApy = details.maxBoostedApy || 0;
      const impliedApy = details.impliedApy || 0;
      const pendleApy = details.pendleApy || 0;
      
      // Use aggregatedApy as primary, fallback to maxBoostedApy, then impliedApy
      const apy = aggregatedApy > 0 ? aggregatedApy : (maxBoostedApy > 0 ? maxBoostedApy : (impliedApy > 0 ? impliedApy : 0));
      const impliedYield = impliedApy > 0 ? impliedApy : (apy > 0 ? apy * 1.05 : 0);

      // Extract TVL from details (API provides 'liquidity' field)
      const tvl = details.liquidity || details.totalTvl || details.tvl || poolData?.tvl || 0;

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

      // Extract token addresses from market data (format: "chainId-address")
      const extractTokenAddress = (tokenStr: string | undefined): string => {
        if (!tokenStr) return '';
        if (tokenStr.includes('-')) {
          return tokenStr.split('-').pop() || '';
        }
        return tokenStr;
      };

      const ptAddress = extractTokenAddress(market.pt);
      const ytAddress = extractTokenAddress(market.yt);
      const syAddress = extractTokenAddress(market.sy);
      const underlyingAssetAddress = extractTokenAddress(market.underlyingAsset);

      return {
        address: market.address,
        name: market.name || `PT-${underlyingAsset}`,
        symbol: market.name || `PT-${underlyingAsset}`,
        underlyingAsset: underlyingAsset,
        // Include token addresses for reference (will be converted to Token objects in unified format)
        ptAddress, // Store PT address
        ytAddress, // Store YT address
        syAddress, // Store SY address
        underlyingAssetAddress, // Store underlying asset address
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
