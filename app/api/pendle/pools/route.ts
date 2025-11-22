import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, PendlePool } from '@/types';

/**
 * Pendle Pools API
 * Fetches available Pendle pools with PT/YT data
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stablecoinOnly = searchParams.get('stablecoin') === 'true';

    // TODO: Implement Pendle SDK integration
    // import { getPools } from '@pendle/sdk';
    // const pools = await getPools(CHAIN_ID);

    const mockPools: PendlePool[] = [
      {
        address: '0x...',
        name: 'PT-sUSDe-26DEC2024',
        symbol: 'PT-sUSDe',
        underlyingAsset: 'sUSDe',
        maturity: Math.floor(new Date('2024-12-26').getTime() / 1000),
        tvl: 50000000,
        apy: 12.5,
        impliedYield: 13.2,
        ptPrice: 0.97,
        ytPrice: 0.03,
        ptDiscount: 0.03,
        daysToMaturity: 34,
        strategyTag: 'Best PT',
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
      error: 'Failed to fetch Pendle pools',
    }, { status: 500 });
  }
}
