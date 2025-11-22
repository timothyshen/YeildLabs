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
 *   address?: string; // Optional, will fetch from Octav if not provided
 *   assets?: WalletAsset[]; // Optional, will fetch from Octav if not provided
 *   riskLevel?: 'conservative' | 'neutral' | 'aggressive';
 *   chainId?: number;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      address,
      assets,
      riskLevel = 'neutral',
      chainId = BASE_CHAIN_ID,
    } = body;

    // If assets not provided, try to fetch from Octav
    let userAssets: WalletAsset[] = assets || [];

    if (!userAssets.length && address) {
      try {
        console.log(`📊 Fetching assets from Octav for ${address}`);
        const octavResponse = await fetch(
          `${request.nextUrl.origin}/api/octav?address=${address}`
        );
        const octavData = await octavResponse.json();

        if (octavData.success && octavData.data?.assets) {
          // Transform Octav assets to WalletAsset format
          userAssets = octavData.data.assets.map((asset: any) => ({
            token: asset.token || asset.address || '',
            symbol: asset.symbol || '',
            balance: asset.balance || asset.balanceFormatted || 0,
            valueUSD: asset.valueUSD || 0,
          }));
          console.log(`✅ Fetched ${userAssets.length} assets from Octav`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch assets from Octav:', error);
      }
    }

    if (!userAssets.length) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'No assets provided or found. Please provide assets array or wallet address.',
      }, { status: 400 });
    }

    // Filter out assets with zero value
    userAssets = userAssets.filter((asset) => (asset.valueUSD || 0) > 0);

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

