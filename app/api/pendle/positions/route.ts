import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, PendlePosition } from '@/types';
import { getUserPendlePositions } from '@/lib/pendle/positions';
import { BASE_CHAIN_ID } from '@/lib/pendle/config';

/**
 * Pendle Positions API
 * Fetches user's Pendle positions by combining API market data with on-chain balances
 * 
 * GET /api/pendle/positions?address=<wallet_address>&chainId=8453
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const chainIdParam = searchParams.get('chainId');
    const chainId = chainIdParam ? parseInt(chainIdParam, 10) : BASE_CHAIN_ID;

    if (!address) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Wallet address is required',
      }, { status: 400 });
    }

    // Validate address format (basic check)
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid wallet address format',
      }, { status: 400 });
    }

    console.log(`📊 Fetching Pendle positions for ${address} on chain ${chainId}`);

    // Fetch positions
    const positions = await getUserPendlePositions(address, chainId);

    // Calculate totals
    const totalPositionsValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalPnL = positions.reduce((sum, pos) => sum + pos.totalPnL, 0);
    const weightedAPY = positions.length > 0
      ? positions.reduce((sum, pos) => sum + (pos.currentAPY * pos.currentValue), 0) / totalPositionsValue
      : 0;

    return NextResponse.json<ApiResponse<{
      positions: PendlePosition[];
      summary: {
        totalPositions: number;
        totalValue: number;
        totalPnL: number;
        weightedAPY: number;
      };
    }>>({
      success: true,
      data: {
        positions,
        summary: {
          totalPositions: positions.length,
          totalValue: totalPositionsValue,
          totalPnL,
          weightedAPY,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching Pendle positions:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Pendle positions',
    }, { status: 500 });
  }
}

