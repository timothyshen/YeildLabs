/**
 * Pendle Swap Functions
 * 
 * Functions for swapping between PT, SY, YT, and underlying tokens
 */

import { callConvertAPI, getTransactionData, type ConvertParams } from './sdkClient';

export interface SwapParams {
  chainId: number;
  tokenIn: string;        // Token address
  amountIn: string;       // Amount in wei (string)
  tokenOut: string;       // Token address
  receiver: string;       // Receiver address
  slippage: number;      // Slippage (0.01 = 1%)
  enableAggregator?: boolean;
  aggregators?: string;
}

/**
 * Swap PT to SY
 */
export async function swapPtToSy(params: SwapParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Swap PT to underlying token
 */
export async function swapPtToToken(params: SwapParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Swap SY to PT
 */
export async function swapSyToPt(params: SwapParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Swap SY to YT
 */
export async function swapSyToYt(params: SwapParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Swap underlying token to YT
 */
export async function swapTokenToYt(params: SwapParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Swap underlying token to PT
 */
export async function swapTokenToPt(params: SwapParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Swap YT to SY
 */
export async function swapYtToSy(params: SwapParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Swap YT to underlying token
 */
export async function swapYtToToken(params: SwapParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Swap token to PT using aggregator (for tokens that can't be directly swapped)
 */
export async function swapTokenToPtUsingAggregation(params: SwapParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
    enableAggregator: true,
    aggregators: params.aggregators || 'kyberswap',
  });
}

/**
 * Swap PT to token using aggregator
 */
export async function swapPtToTokenUsingAggregation(params: SwapParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
    enableAggregator: true,
    aggregators: params.aggregators || 'kyberswap',
    additionalData: 'impliedApy,effectiveApy',
  });
}

/**
 * Generic swap function - automatically determines swap type
 */
export async function swap(params: SwapParams) {
  // For now, use the generic convert API
  // In the future, we could add logic to determine the best swap function
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
    enableAggregator: params.enableAggregator,
    aggregators: params.aggregators,
  });
}

