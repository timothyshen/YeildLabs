import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, SwapQuote } from '@/types';

/**
 * 1inch Swap Quote API
 * Gets swap quotes for token swaps
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromToken = searchParams.get('fromToken');
    const toToken = searchParams.get('toToken');
    const amount = searchParams.get('amount');

    if (!fromToken || !toToken || !amount) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Missing required parameters: fromToken, toToken, amount',
      }, { status: 400 });
    }

    // TODO: Implement 1inch API integration
    // const chainId = 8453; // Base
    // const response = await fetch(
    //   `https://api.1inch.dev/swap/v6.0/${chainId}/quote?src=${fromToken}&dst=${toToken}&amount=${amount}`,
    //   {
    //     headers: {
    //       'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
    //     },
    //   }
    // );

    const mockQuote: SwapQuote = {
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: (parseFloat(amount) * 0.99).toString(), // Mock 1% slippage
      priceImpact: 0.5,
      gas: '150000',
      route: [fromToken, toToken],
    };

    return NextResponse.json<ApiResponse<SwapQuote>>({
      success: true,
      data: mockQuote,
    });
  } catch (error) {
    console.error('1inch API error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to get swap quote',
    }, { status: 500 });
  }
}
