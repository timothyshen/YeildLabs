import { NextRequest, NextResponse } from 'next/server';
import { getSwapTransaction, toWei } from '@/lib/1inch/client';
import { is1inchConfigured, BASE_CHAIN_ID } from '@/lib/1inch/config';
import type { ApiResponse } from '@/types';
import type { SwapTransaction } from '@/lib/1inch/types';

/**
 * 1inch Swap Execution API
 * POST /api/1inch/swap
 *
 * Returns transaction data for executing a token swap
 */
export async function POST(request: NextRequest) {
  try {
    // Check if 1inch is configured
    if (!is1inchConfigured()) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: '1inch API key not configured',
      }, { status: 503 });
    }

    const body = await request.json();
    const {
      fromToken,
      toToken,
      amount,
      fromAddress,
      slippage = 1,
      fromDecimals = 18,
      chainId = BASE_CHAIN_ID,
    } = body;

    // Validate required parameters
    if (!fromToken || !toToken || !amount || !fromAddress) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Missing required parameters: fromToken, toToken, amount, fromAddress',
      }, { status: 400 });
    }

    console.log('🔄 Getting 1inch swap transaction:', {
      fromToken,
      toToken,
      amount,
      fromAddress,
      slippage,
      chainId,
    });

    // Convert amount to wei
    const amountWei = toWei(amount, fromDecimals);

    // Get swap transaction from 1inch
    const swapResponse = await getSwapTransaction({
      src: fromToken,
      dst: toToken,
      amount: amountWei,
      from: fromAddress,
      slippage,
      disableEstimate: false,
      allowPartialFill: false,
    }, chainId);

    // Format transaction
    const transaction: SwapTransaction = {
      to: swapResponse.tx.to,
      data: swapResponse.tx.data,
      value: swapResponse.tx.value,
      gas: swapResponse.tx.gas,
      gasPrice: swapResponse.tx.gasPrice,
      from: swapResponse.tx.from,
    };

    console.log('✅ Swap transaction prepared:', {
      to: transaction.to,
      from: transaction.from,
      gas: transaction.gas,
      value: transaction.value,
    });

    return NextResponse.json<ApiResponse<SwapTransaction>>({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('❌ Error getting swap transaction:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare swap transaction',
    }, { status: 500 });
  }
}
