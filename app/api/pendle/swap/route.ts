import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { swap } from '@/lib/pendle/swaps';
import { BASE_CHAIN_ID } from '@/lib/pendle/config';

/**
 * Pendle Swap API
 * 
 * POST /api/pendle/swap
 * Body: {
 *   chainId?: number;
 *   tokenIn: string;
 *   amountIn: string;
 *   tokenOut: string;
 *   receiver: string;
 *   slippage: number;
 *   enableAggregator?: boolean;
 *   aggregators?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      chainId = BASE_CHAIN_ID,
      tokenIn,
      amountIn,
      tokenOut,
      receiver,
      slippage = 0.01,
      enableAggregator,
      aggregators,
    } = body;

    // Validation
    if (!tokenIn || !amountIn || !tokenOut || !receiver) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Missing required parameters: tokenIn, amountIn, tokenOut, receiver',
      }, { status: 400 });
    }

    // Validate addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(tokenIn) || !addressRegex.test(tokenOut) || !addressRegex.test(receiver)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid address format',
      }, { status: 400 });
    }

    // Validate slippage (0.1% to 10%)
    if (slippage < 0.001 || slippage > 0.1) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Slippage must be between 0.1% (0.001) and 10% (0.1)',
      }, { status: 400 });
    }

    console.log(`🔄 Getting swap transaction data: ${tokenIn} -> ${tokenOut}`);

    // Get transaction data from SDK
    const txData = await swap({
      chainId,
      tokenIn,
      amountIn,
      tokenOut,
      receiver,
      slippage,
      enableAggregator,
      aggregators,
    });

    return NextResponse.json<ApiResponse<typeof txData>>({
      success: true,
      data: txData,
    });
  } catch (error) {
    console.error('❌ Error getting swap transaction data:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get swap transaction data',
    }, { status: 500 });
  }
}

