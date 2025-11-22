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
      console.warn('OCTAV_API_KEY not set, using mock data');
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

      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: `Octav API error: ${errorMessage}`,
      }, { status: response.status });
    }

    const portfolio: OctavPortfolio = await response.json();

    // Transform Octav data to our format
    const transformed = octavToLegacyFormat(portfolio);

    return NextResponse.json<ApiResponse<typeof transformed>>({
      success: true,
      data: transformed,
    });
  } catch (error) {
    console.error('Octav API error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch data from Octav',
    }, { status: 500 });
  }
}
