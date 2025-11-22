import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, UserPosition, WalletAsset } from '@/types';
import type { OctavPortfolio } from '@/types/octav';
import { octavToLegacyFormat } from '@/lib/utils/octavTransform';

/**
 * Octav Portfolio API Integration
 * Fetches user positions and wallet assets from Octav
 * 
 * Based on: https://docs.octav.fi/api/endpoints/portfolio
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const includeImages = searchParams.get('includeImages') === 'true';
    const waitForSync = searchParams.get('waitForSync') === 'true';

    if (!address) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Wallet address is required',
      }, { status: 400 });
    }

    const octavApiKey = process.env.OCTAV_API_KEY;

    if (!octavApiKey) {
      console.warn('⚠️ OCTAV_API_KEY not set, using mock data');
      // Return mock data if API key is not configured
      const mockData: { positions: UserPosition[], assets: WalletAsset[], totalValueUSD: number } = {
        positions: [],
        assets: [],
        totalValueUSD: 0,
      };

      return NextResponse.json<ApiResponse<typeof mockData>>({
        success: true,
        data: mockData,
      });
    }

    console.log('✅ Octav API key found, fetching portfolio for:', address);

    // Build query parameters
    const params = new URLSearchParams({
      addresses: address,
      includeImages: includeImages.toString(),
      waitForSync: waitForSync.toString(),
    });

    // Call Octav API
    const response = await fetch(
      `https://api.octav.fi/v1/portfolio?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${octavApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;

      console.error('❌ Octav API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorData,
      });

      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: `Octav API error: ${errorMessage}`,
      }, { status: response.status });
    }

    const responseData = await response.json();

    // Octav API may return an array if multiple addresses, or a single object
    let portfolio: OctavPortfolio;
    if (Array.isArray(responseData)) {
      // If array, take the first item (we only requested one address)
      portfolio = responseData[0];
      if (!portfolio) {
        console.error('❌ Empty array response from Octav API');
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'No portfolio data returned for address',
        }, { status: 404 });
      }
    } else {
      portfolio = responseData;
    }

    // Validate response structure
    if (!portfolio || typeof portfolio !== 'object') {
      console.error('❌ Invalid portfolio response structure:', portfolio);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid response from Octav API',
      }, { status: 500 });
    }

    console.log('✅ Octav API response received:', {
      address: portfolio.address,
      networth: portfolio.networth,
      hasAssetByProtocols: !!portfolio.assetByProtocols,
      assetsCount: portfolio.assetByProtocols ? Object.keys(portfolio.assetByProtocols).length : 0,
      hasChains: !!portfolio.chains,
      chains: portfolio.chains ? Object.keys(portfolio.chains) : [],
      rawResponse: JSON.stringify(portfolio).substring(0, 200), // First 200 chars for debugging
    });

    // Transform Octav data to our format
    let transformed;
    try {
      transformed = octavToLegacyFormat(portfolio);
    } catch (transformError) {
      console.error('❌ Error transforming Octav data:', transformError);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: `Failed to transform portfolio data: ${transformError instanceof Error ? transformError.message : 'Unknown error'}`,
      }, { status: 500 });
    }

    console.log('✅ Transformed data:', {
      assets: transformed.assets.length,
      positions: transformed.positions.length,
      totalValue: transformed.totalValueUSD,
    });

    // Return both transformed data and full portfolio for dashboard use
    return NextResponse.json<ApiResponse<typeof transformed & { portfolio: OctavPortfolio }>>({
      success: true,
      data: {
        ...transformed,
        portfolio, // Include full portfolio data
      },
    });
  } catch (error) {
    console.error('Octav API error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch data from Octav',
    }, { status: 500 });
  }
}
