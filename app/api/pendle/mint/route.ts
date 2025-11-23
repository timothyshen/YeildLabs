import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { mintSyFromToken, mintPyFromSy, mintPyFromToken } from '@/lib/pendle/mint';
import { BASE_CHAIN_ID } from '@/lib/pendle/config';

/**
 * Pendle Mint API
 * 
 * POST /api/pendle/mint
 * Body: {
 *   type: 'sy' | 'py';
 *   chainId?: number;
 *   tokenIn: string;
 *   amountIn: string;
 *   syToken?: string;      // Required for 'sy' type
 *   ptToken?: string;      // Required for 'py' type
 *   ytToken?: string;      // Required for 'py' type
 *   receiver: string;
 *   slippage: number;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      type,
      chainId = BASE_CHAIN_ID,
      tokenIn,
      amountIn,
      syToken,
      ptToken,
      ytToken,
      receiver,
      slippage = 0.01,
    } = body;

    // Validation
    if (!type || !tokenIn || !amountIn || !receiver) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Missing required parameters: type, tokenIn, amountIn, receiver',
      }, { status: 400 });
    }

    // Validate addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(tokenIn) || !addressRegex.test(receiver)) {
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

    if (type === 'sy') {
      // Mint SY
      if (!syToken || !addressRegex.test(syToken)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'syToken is required and must be a valid address',
        }, { status: 400 });
      }

      console.log(`🪙 Getting mint SY transaction data: ${tokenIn} -> ${syToken}`);
      txData = await mintSyFromToken({
        chainId,
        tokenIn,
        amountIn,
        syToken,
        receiver,
        slippage,
      });
    } else if (type === 'py') {
      // Mint PT + YT
      if (!ptToken || !ytToken || !addressRegex.test(ptToken) || !addressRegex.test(ytToken)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'ptToken and ytToken are required and must be valid addresses',
        }, { status: 400 });
      }

      // Check if tokenIn is SY or underlying token
      // For now, try mintPyFromSy first (can be extended)
      console.log(`🪙 Getting mint PT/YT transaction data: ${tokenIn} -> ${ptToken},${ytToken}`);
      txData = await mintPyFromSy({
        chainId,
        tokenIn,
        amountIn,
        ptToken,
        ytToken,
        receiver,
        slippage,
      });
    } else {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid type. Must be "sy" or "py"',
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<typeof txData>>({
      success: true,
      data: txData,
    });
  } catch (error) {
    console.error('❌ Error getting mint transaction data:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get mint transaction data',
    }, { status: 500 });
  }
}

