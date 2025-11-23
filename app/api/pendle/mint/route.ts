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

    // Normalize addresses (remove chainId prefix if present)
    const normalizeAddress = (addr: string): string => {
      if (!addr) return '';
      if (addr.includes('-')) {
        return addr.split('-').pop() || addr;
      }
      return addr;
    };
    
    const normalizedTokenIn = normalizeAddress(tokenIn);
    const normalizedReceiver = normalizeAddress(receiver);
    
    // Validate addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!normalizedTokenIn || !addressRegex.test(normalizedTokenIn)) {
      console.error('❌ Invalid tokenIn address:', { original: tokenIn, normalized: normalizedTokenIn });
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: `Invalid tokenIn address format: ${tokenIn}`,
      }, { status: 400 });
    }
    
    if (!normalizedReceiver || !addressRegex.test(normalizedReceiver)) {
      console.error('❌ Invalid receiver address:', { original: receiver, normalized: normalizedReceiver });
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: `Invalid receiver address format: ${receiver}`,
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
      const normalizedSyToken = normalizeAddress(syToken || '');
      if (!normalizedSyToken || !addressRegex.test(normalizedSyToken)) {
        console.error('❌ Invalid syToken address:', { original: syToken, normalized: normalizedSyToken });
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: `syToken is required and must be a valid address: ${syToken}`,
        }, { status: 400 });
      }

      console.log(`🪙 Getting mint SY transaction data: ${normalizedTokenIn} -> ${normalizedSyToken}`);
      txData = await mintSyFromToken({
        chainId,
        tokenIn: normalizedTokenIn,
        amountIn,
        syToken: normalizedSyToken,
        receiver: normalizedReceiver,
        slippage,
      });
    } else if (type === 'py') {
      // Mint PT + YT
      const normalizedPtToken = normalizeAddress(ptToken || '');
      const normalizedYtToken = normalizeAddress(ytToken || '');
      
      if (!normalizedPtToken || !normalizedYtToken) {
        console.error('❌ Missing PT or YT token:', { ptToken, ytToken, normalizedPtToken, normalizedYtToken });
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'ptToken and ytToken are required for py type',
        }, { status: 400 });
      }

      if (!addressRegex.test(normalizedPtToken) || !addressRegex.test(normalizedYtToken)) {
        console.error('❌ Invalid PT or YT token address:', {
          ptToken: { original: ptToken, normalized: normalizedPtToken },
          ytToken: { original: ytToken, normalized: normalizedYtToken },
        });
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: `Invalid ptToken or ytToken address format. PT: ${ptToken}, YT: ${ytToken}`,
        }, { status: 400 });
      }

      // Use mintPyFromToken for underlying token -> PT+YT
      console.log(`🪙 Getting mint PT+YT transaction data: ${normalizedTokenIn} -> PT:${normalizedPtToken} + YT:${normalizedYtToken}`);
      txData = await mintPyFromToken({
        chainId,
        tokenIn: normalizedTokenIn,
        amountIn,
        ptToken: normalizedPtToken,
        ytToken: normalizedYtToken,
        receiver: normalizedReceiver,
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

