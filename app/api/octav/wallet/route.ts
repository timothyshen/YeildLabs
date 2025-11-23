import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

/**
 * Octav Wallet API Integration
 * Fetches wallet data from Octav wallet endpoint
 * 
 * Based on: https://api.octav.fi/v1/wallet?addresses={address}
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('addresses') || searchParams.get('address');

    if (!address) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Wallet address is required',
      }, { status: 400 });
    }

    const octavApiKey = process.env.OCTAV_API_KEY;

    if (!octavApiKey) {
      console.warn('⚠️ OCTAV_API_KEY not set, returning empty data');
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        data: null,
      });
    }

    console.log('✅ Octav API key found, fetching wallet data for:', address);

    // Build query parameters
    const params = new URLSearchParams({
      addresses: address,
    });

    // Call Octav Wallet API
    const response = await fetch(
      `https://api.octav.fi/v1/wallet?${params.toString()}`,
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

      console.error('❌ Octav Wallet API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorData,
      });

      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: `Octav Wallet API error: ${errorMessage}`,
      }, { status: response.status });
    }

    const responseData = await response.json();

    // Octav Wallet API may return an array if multiple addresses, or a single object
    let walletData: any;
    if (Array.isArray(responseData)) {
      // If array, take the first item (we only requested one address)
      walletData = responseData[0];
      if (!walletData) {
        console.error('❌ Empty array response from Octav Wallet API');
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'No wallet data returned for address',
        }, { status: 404 });
      }
    } else {
      walletData = responseData;
    }

    // Validate response structure
    if (!walletData || typeof walletData !== 'object') {
      console.error('❌ Invalid wallet response structure:', walletData);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid response from Octav Wallet API',
      }, { status: 500 });
    }

    console.log('✅ Octav Wallet API response received:', {
      address: walletData.address,
      hasChains: !!walletData.chains,
      chains: walletData.chains ? Object.keys(walletData.chains) : [],
      hasAssetByProtocols: !!walletData.assetByProtocols,
      assetByProtocolsKeys: walletData.assetByProtocols ? Object.keys(walletData.assetByProtocols) : [],
    });

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: walletData,
    });
  } catch (error) {
    console.error('❌ Octav Wallet API error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch data from Octav Wallet API',
    }, { status: 500 });
  }
}
