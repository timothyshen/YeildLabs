/**
 * Pendle Redeem Functions
 *
 * Functions for redeeming PT/YT and SY tokens back to underlying tokens
 */

import { getTransactionData, type ConvertParams } from './sdkClient';

export interface RedeemPyParams {
  chainId: number;
  ptToken: string;        // PT token address
  ytToken: string;        // YT token address
  ptAmount: string;       // PT amount in wei (string)
  ytAmount: string;       // YT amount in wei (string)
  tokenOut: string;       // Output token address (underlying or SY)
  receiver: string;
  slippage: number;
}

export interface RedeemSyParams {
  chainId: number;
  syToken: string;        // SY token address
  syAmount: string;       // SY amount in wei (string)
  tokenOut: string;       // Output token address (underlying token)
  receiver: string;
  slippage: number;
}

/**
 * Redeem PT + YT to SY or underlying token
 * Note: PT and YT must be redeemed in equal amounts (1:1 ratio)
 */
export async function redeemPyToToken(params: RedeemPyParams) {
  return getTransactionData(params.chainId, {
    tokensIn: `${params.ptToken},${params.ytToken}`, // Comma-separated for multiple inputs
    amountsIn: `${params.ptAmount},${params.ytAmount}`, // Comma-separated amounts
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}

/**
 * Redeem SY to underlying token
 */
export async function redeemSyToToken(params: RedeemSyParams) {
  return getTransactionData(params.chainId, {
    tokensIn: params.syToken,
    amountsIn: params.syAmount,
    tokensOut: params.tokenOut,
    receiver: params.receiver,
    slippage: params.slippage,
  });
}
