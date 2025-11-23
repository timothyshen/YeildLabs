import { NextRequest, NextResponse } from 'next/server';
import { getSwapQuote, fromWei, toWei } from '@/lib/1inch/client';
import { is1inchConfigured, BASE_CHAIN_ID, type ChainId } from '@/lib/1inch/config';
import type { ApiResponse } from '@/types';
import type { SwapQuote } from '@/lib/1inch/types';

/**
 * 1inch Swap Quote API
 * GET /api/1inch/quote?fromToken=<address>&toToken=<address>&amount=<amount>&slippage=<slippage>
 *
 * Returns a quote for swapping tokens without executing the swap
 */
export async function GET(request: NextRequest) {
  try {
    // Check if 1inch is configured
    if (!is1inchConfigured()) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: '1inch API key not configured',
      }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const fromToken = searchParams.get('fromToken');
    const toToken = searchParams.get('toToken');
    const amount = searchParams.get('amount');
    const slippage = searchParams.get('slippage') || '1';
    const fromDecimals = parseInt(searchParams.get('fromDecimals') || '18');
    const toDecimals = parseInt(searchParams.get('toDecimals') || '18');
    const chainId = parseInt(searchParams.get('chainId') || String(BASE_CHAIN_ID)) as ChainId;

    // Validate required parameters
    if (!fromToken || !toToken || !amount) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Missing required parameters: fromToken, toToken, amount',
      }, { status: 400 });
    }

    console.log('📊 Getting 1inch quote:', {
      fromToken,
      toToken,
      amount,
      slippage,
      chainId,
    });

    // Convert amount to wei
    const amountWei = toWei(amount, fromDecimals);

    // Get quote from 1inch
    const quoteResponse = await getSwapQuote({
      src: fromToken,
      dst: toToken,
      amount: amountWei,
      slippage: parseFloat(slippage),
      includeTokensInfo: true,
      includeProtocols: true,
      includeGas: true,
    }, chainId);

    // Format response
    const quote: SwapQuote = {
      fromToken: {
        address: fromToken,
        symbol: searchParams.get('fromSymbol') || 'Unknown',
        name: searchParams.get('fromName') || 'Unknown',
        decimals: fromDecimals,
      },
      toToken: {
        address: toToken,
        symbol: searchParams.get('toSymbol') || 'Unknown',
        name: searchParams.get('toName') || 'Unknown',
        decimals: toDecimals,
      },
      fromAmount: amount,
      toAmount: fromWei(quoteResponse.dstAmount, toDecimals),
      fromAmountWei: amountWei,
      toAmountWei: quoteResponse.dstAmount,
      protocols: quoteResponse.protocols || [],
      estimatedGas: quoteResponse.gas || quoteResponse.estimatedGas || 0,
      slippage: parseFloat(slippage),
      executionPrice: (
        parseFloat(fromWei(quoteResponse.dstAmount, toDecimals)) /
        parseFloat(amount)
      ).toFixed(6),
    };

    console.log('✅ Quote generated:', quote);

    return NextResponse.json<ApiResponse<SwapQuote>>({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error('❌ Error getting 1inch quote:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get swap quote',
    }, { status: 500 });
  }
}
