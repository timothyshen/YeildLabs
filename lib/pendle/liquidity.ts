/**
 * Pendle Liquidity Functions
 * 
 * Functions for adding and removing liquidity from Pendle pools
 */

import { getTransactionData, type ConvertParams } from './sdkClient';

export interface AddLiquidityParams {
  chainId: number;
  tokenIn: string;        // PT, SY, or underlying token address
  amountIn: string;
  lpToken: string;        // LP token address (market address)
  ytToken?: string;       // Optional: YT token for ZPI mode
  receiver: string;
  slippage: number;
}

export interface RemoveLiquidityParams {
  chainId: number;
  lpToken: string;
  amountIn: string;       // LP token amount to remove
  tokenOut: string;       // PT, SY, or underlying token address
  receiver: string;
  slippage: number;
}

/**
 * Add liquidity with PT only
 */
export async function addLiquiditySinglePt(params: AddLiquidityParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.lpToken,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Add liquidity with SY only
 */
export async function addLiquiditySingleSy(params: AddLiquidityParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.lpToken,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Add liquidity with SY (ZPI mode - keep YT)
 */
export async function addLiquiditySingleSyKeepYt(params: AddLiquidityParams) {
  if (!params.ytToken) {
    throw new Error('YT token address is required for ZPI mode');
  }
  
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: `${params.lpToken},${params.ytToken}`, // LP + YT (ZPI mode)
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Add liquidity with underlying token only
 */
export async function addLiquiditySingleToken(params: AddLiquidityParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.lpToken,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Add liquidity with underlying token (ZPI mode - keep YT)
 */
export async function addLiquiditySingleTokenKeepYt(params: AddLiquidityParams) {
  if (!params.ytToken) {
    throw new Error('YT token address is required for ZPI mode');
  }
  
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: `${params.lpToken},${params.ytToken}`, // LP + YT (ZPI mode)
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Remove liquidity (LP -> token)
 */
export async function removeLiquidity(params: RemoveLiquidityParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.lpToken,
    amountsIn: params.amountIn,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Generic add liquidity function - automatically determines type
 */
export async function addLiquidity(params: AddLiquidityParams) {
  // If YT token is provided, use ZPI mode
  if (params.ytToken) {
    // Determine if tokenIn is SY or underlying token
    // For now, use the ZPI mode function
    return addLiquiditySingleSyKeepYt(params);
  }
  
  // Otherwise, use standard single-sided liquidity
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.lpToken,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

