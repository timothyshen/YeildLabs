import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import type { WalletAsset, PendlePool } from '@/types';
import { fetchMarkets } from '@/lib/pendle/apiClient';
import { transformMarketsToPools } from '../pools/route';
import { getRecommendationsForPortfolio } from '@/lib/pendle/recommendations';
import { BASE_CHAIN_ID } from '@/lib/pendle/config';

/**
 * Pendle Recommendations API
 * 
 * Suggests Pendle pools based on user assets
 * 
 * POST /api/pendle/recommend
 * Body: {
 *   assets: WalletAsset[]; // Required: Array of user assets
 *   riskLevel?: 'conservative' | 'neutral' | 'aggressive';
 *   chainId?: number;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      assets,
      riskLevel = 'neutral',
      chainId = BASE_CHAIN_ID,
    } = body;

    // Assets are required
    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Assets array is required. Please provide an array of assets.',
      }, { status: 400 });
    }

    // Filter out assets with zero value
    const userAssets: WalletAsset[] = assets.filter((asset) => (asset.valueUSD || 0) > 0);

    if (!userAssets.length) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'No assets with value found.',
      }, { status: 400 });
    }

    console.log(`🔍 Generating recommendations for ${userAssets.length} assets`);

    // Fetch all pools
    const markets = await fetchMarkets(chainId);
    
    if (!markets || markets.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'No Pendle markets found for the specified chain.',
      }, { status: 404 });
    }

    // Transform markets to pools
    const allPools = transformMarketsToPools(markets, null);

    if (!allPools.length) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'No valid pools found.',
      }, { status: 404 });
    }

    console.log(`📊 Found ${allPools.length} pools, matching with ${userAssets.length} assets`);

    // Generate recommendations
    const recommendations = getRecommendationsForPortfolio(
      userAssets,
      allPools,
      riskLevel
    );

    // Attach raw market data to recommendations for PT/YT address extraction
    // Create a map of pool address -> market data
    const marketMap = new Map<string, any>();
    markets.forEach((market) => {
      if (market.address) {
        marketMap.set(market.address.toLowerCase(), market);
      }
    });

    // Attach market data to each pool in recommendations
    recommendations.recommendations.forEach((rec: any) => {
      if (rec.pools?.bestPT?.address) {
        const market = marketMap.get(rec.pools.bestPT.address.toLowerCase());
        if (market) {
          rec.pools.bestPT._market = market; // Attach raw market data
        }
      }
      if (rec.pools?.bestYT?.address) {
        const market = marketMap.get(rec.pools.bestYT.address.toLowerCase());
        if (market) {
          rec.pools.bestYT._market = market; // Attach raw market data
        }
      }
    });

    if (recommendations.recommendations.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'No matching pools found for your assets.',
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<typeof recommendations>>({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error('❌ Error generating recommendations:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate recommendations',
    }, { status: 500 });
  }
}

