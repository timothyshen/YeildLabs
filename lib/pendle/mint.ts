/**
 * Pendle Mint Functions
 * 
 * Functions for minting SY and PT/YT tokens
 */

import { getTransactionData, type ConvertParams } from './sdkClient';

export interface MintSyParams {
  chainId: number;
  tokenIn: string;        // Underlying token address
  amountIn: string;       // Amount in wei (string)
  syToken: string;        // SY token address
  receiver: string;
  slippage: number;
}

export interface MintPyParams {
  chainId: number;
  tokenIn: string;        // SY or underlying token address
  amountIn: string;
  ptToken: string;       // PT token address
  ytToken: string;       // YT token address
  receiver: string;
  slippage: number;
}

/**
 * Mint SY from underlying token
 */
export async function mintSyFromToken(params: MintSyParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: params.syToken,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Mint PT + YT from SY
 */
export async function mintPyFromSy(params: MintPyParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: `${params.ptToken},${params.ytToken}`, // Comma-separated for multiple outputs
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Mint PT + YT from underlying token
 */
export async function mintPyFromToken(params: MintPyParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.tokenIn,
    amountsIn: params.amountIn,
    tokensOut: `${params.ptToken},${params.ytToken}`, // Comma-separated for multiple outputs
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

