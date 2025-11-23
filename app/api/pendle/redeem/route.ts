import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { redeemPyToToken, redeemSyToToken } from '@/lib/pendle/redeem';
import { BASE_CHAIN_ID } from '@/lib/pendle/config';

/**
 * Pendle Redeem API
 *
 * POST /api/pendle/redeem
 * Body: {
 *   type: 'py' | 'sy';
 *   chainId?: number;
 *
 *   // For type='py' (redeem PT + YT):
 *   ptToken: string;
 *   ytToken: string;
 *   ptAmount: string;
 *   ytAmount: string;
 *
 *   // For type='sy' (redeem SY):
 *   syToken: string;
 *   syAmount: string;
 *
 *   // Common:
 *   tokenOut: string;      // Underlying token to receive
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
      ptToken,
      ytToken,
      ptAmount,
      ytAmount,
      syToken,
      syAmount,
      tokenOut,
      receiver,
      slippage = 0.01,
    } = body;

    // Validation
    if (!type || !tokenOut || !receiver) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Missing required parameters: type, tokenOut, receiver',
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

    const normalizedTokenOut = normalizeAddress(tokenOut);
    const normalizedReceiver = normalizeAddress(receiver);

    // Validate addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!normalizedTokenOut || !addressRegex.test(normalizedTokenOut)) {
      console.error('❌ Invalid tokenOut address:', { original: tokenOut, normalized: normalizedTokenOut });
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: `Invalid tokenOut address format: ${tokenOut}`,
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

    if (type === 'py') {
      // Redeem PT + YT
      const normalizedPtToken = normalizeAddress(ptToken || '');
      const normalizedYtToken = normalizeAddress(ytToken || '');

      if (!normalizedPtToken || !normalizedYtToken || !ptAmount || !ytAmount) {
        console.error('❌ Missing PT/YT token or amount:', { ptToken, ytToken, ptAmount, ytAmount });
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'ptToken, ytToken, ptAmount, and ytAmount are required for py type',
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

      console.log(`💰 Getting redeem PT+YT transaction data: PT:${normalizedPtToken}(${ptAmount}) + YT:${normalizedYtToken}(${ytAmount}) -> ${normalizedTokenOut}`);
      txData = await redeemPyToToken({
        chainId,
        ptToken: normalizedPtToken,
        ytToken: normalizedYtToken,
        ptAmount,
        ytAmount,
        tokenOut: normalizedTokenOut,
        receiver: normalizedReceiver,
        slippage,
      });
    } else if (type === 'sy') {
      // Redeem SY
      const normalizedSyToken = normalizeAddress(syToken || '');

      if (!normalizedSyToken || !syAmount) {
        console.error('❌ Missing SY token or amount:', { syToken, syAmount });
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'syToken and syAmount are required for sy type',
        }, { status: 400 });
      }

      if (!addressRegex.test(normalizedSyToken)) {
        console.error('❌ Invalid SY token address:', { original: syToken, normalized: normalizedSyToken });
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: `Invalid syToken address format: ${syToken}`,
        }, { status: 400 });
      }

      console.log(`💰 Getting redeem SY transaction data: ${normalizedSyToken}(${syAmount}) -> ${normalizedTokenOut}`);
      txData = await redeemSyToToken({
        chainId,
        syToken: normalizedSyToken,
        syAmount,
        tokenOut: normalizedTokenOut,
        receiver: normalizedReceiver,
        slippage,
      });
    } else {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid type. Must be "py" or "sy"',
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<typeof txData>>({
      success: true,
      data: txData,
    });
  } catch (error) {
    console.error('❌ Error getting redeem transaction data:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get redeem transaction data',
    }, { status: 500 });
  }
}
