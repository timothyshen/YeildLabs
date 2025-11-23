import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import type { SwapQuote, Token } from '@/types/unified';

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

    // Create mock Token objects
    const fromTokenObj: Token = {
      address: fromToken,
      symbol: 'FROM',
      name: 'From Token',
      decimals: 18,
      chainId: 8453,
    };

    const toTokenObj: Token = {
      address: toToken,
      symbol: 'TO',
      name: 'To Token',
      decimals: 18,
      chainId: 8453,
    };

    const amountNum = parseFloat(amount);
    const toAmountNum = amountNum * 0.99; // Mock 1% slippage

    const mockQuote: SwapQuote = {
      fromToken: fromTokenObj,
      toToken: toTokenObj,
      fromAmount: amount,
      toAmount: toAmountNum.toString(),
      fromAmountFormatted: amountNum,
      toAmountFormatted: toAmountNum,
      priceImpact: 0.5,
      effectivePrice: toAmountNum / amountNum,
      gasEstimate: '150000',
      gasEstimateUSD: 0.5,
      route: [fromTokenObj, toTokenObj],
      provider: '1inch',
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
