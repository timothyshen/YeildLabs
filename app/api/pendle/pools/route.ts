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
      error: 'Failed to fetch Pendle pools',
    }, { status: 500 });
  }
}
