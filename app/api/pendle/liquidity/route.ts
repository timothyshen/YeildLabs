import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import {
  addLiquidity,
  removeLiquidity,
  addLiquiditySingleSyKeepYt,
  addLiquiditySingleTokenKeepYt,
} from '@/lib/pendle/liquidity';
import { BASE_CHAIN_ID } from '@/lib/pendle/config';

/**
 * Pendle Liquidity API
 * 
 * POST /api/pendle/liquidity
 * Body: {
 *   action: 'add' | 'remove';
 *   chainId?: number;
 *   tokenIn: string;        // For add: PT/SY/token, For remove: LP token
 *   amountIn: string;
 *   lpToken: string;         // LP token address (market address)
 *   tokenOut?: string;       // For remove: PT/SY/token
 *   ytToken?: string;        // Optional: For ZPI mode
 *   receiver: string;
 *   slippage: number;
 *   zpiMode?: boolean;        // Zero Price Impact mode (keep YT)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      action,
      chainId = BASE_CHAIN_ID,
      tokenIn,
      amountIn,
      lpToken,
      tokenOut,
      ytToken,
      receiver,
      slippage = 0.01,
      zpiMode = false,
    } = body;

    // Validation
    if (!action || !tokenIn || !amountIn || !lpToken || !receiver) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Missing required parameters: action, tokenIn, amountIn, lpToken, receiver',
      }, { status: 400 });
    }

    // Validate addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(tokenIn) || !addressRegex.test(lpToken) || !addressRegex.test(receiver)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid address format',
      }, { status: 400 });
    }

    // Validate slippage
    if (slippage < 0.001 || slippage > 0.1) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Slippage must be between 0.1% (0.001) and 10% (0.1)',
      }, { status: 400 });
    }

    let txData;

    if (action === 'add') {
      // Add liquidity
      if (zpiMode && ytToken) {
        // ZPI mode - keep YT
        console.log(`💧 Getting add liquidity (ZPI) transaction data: ${tokenIn} -> ${lpToken},${ytToken}`);
        txData = await addLiquiditySingleSyKeepYt({
          chainId,
          tokenIn,
          amountIn,
          lpToken,
          ytToken,
          receiver,
          slippage,
        });
      } else {
        // Standard add liquidity
        console.log(`💧 Getting add liquidity transaction data: ${tokenIn} -> ${lpToken}`);
        txData = await addLiquidity({
          chainId,
          tokenIn,
          amountIn,
          lpToken,
          ytToken,
          receiver,
          slippage,
        });
      }
    } else if (action === 'remove') {
      // Remove liquidity
      if (!tokenOut || !addressRegex.test(tokenOut)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'tokenOut is required for remove action',
        }, { status: 400 });
      }

      console.log(`💧 Getting remove liquidity transaction data: ${lpToken} -> ${tokenOut}`);
      txData = await removeLiquidity({
        chainId,
        lpToken: tokenIn, // For remove, tokenIn is the LP token
        amountIn,
        tokenOut,
        receiver,
        slippage,
      });
    } else {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid action. Must be "add" or "remove"',
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<typeof txData>>({
      success: true,
      data: txData,
    });
  } catch (error) {
    console.error('❌ Error getting liquidity transaction data:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get liquidity transaction data',
    }, { status: 500 });
  }
}

