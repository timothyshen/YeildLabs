/**
 * 1inch API Client
 * Utility functions for interacting with 1inch API
 */

import { get1inchApiUrl, get1inchHeaders, BASE_CHAIN_ID, type ChainId } from './config';
import type {
  QuoteParams,
  QuoteResponse,
  SwapParams,
  SwapResponse,
  ApprovalParams,
  ApprovalResponse,
  AllowanceParams,
  AllowanceResponse,
  OneInchError,
} from './types';

/**
 * Make a request to 1inch API
 */
async function makeRequest<T>(
  endpoint: string,
  params: Record<string, any> = {},
  chainId: ChainId = BASE_CHAIN_ID
): Promise<T> {
  const baseUrl = get1inchApiUrl(chainId);
  const url = new URL(`${baseUrl}${endpoint}`);

  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  console.log('🔍 1inch API Request:', {
    endpoint,
    url: url.toString(),
    params,
  });

  const response = await fetch(url.toString(), {
    headers: get1inchHeaders(),
  });

  if (!response.ok) {
    const error: OneInchError = await response.json().catch(() => ({
      statusCode: response.status,
      error: response.statusText,
      description: 'Failed to parse error response',
    }));

    console.error('❌ 1inch API Error:', error);
    throw new Error(error.description || error.error);
  }

  const data = await response.json();
  console.log('✅ 1inch API Response:', data);

  return data;
}

/**
 * Get swap quote (no transaction)
 */
export async function getSwapQuote(
  params: QuoteParams,
  chainId: ChainId = BASE_CHAIN_ID
): Promise<QuoteResponse> {
  return makeRequest<QuoteResponse>('/quote', params, chainId);
}

/**
 * Get swap transaction data
 */
export async function getSwapTransaction(
  params: SwapParams,
  chainId: ChainId = BASE_CHAIN_ID
): Promise<SwapResponse> {
  return makeRequest<SwapResponse>('/swap', params, chainId);
}

/**
 * Get token approval transaction data
 */
export async function getApprovalTransaction(
  params: ApprovalParams,
  chainId: ChainId = BASE_CHAIN_ID
): Promise<ApprovalResponse> {
  return makeRequest<ApprovalResponse>('/approve/transaction', {
    tokenAddress: params.tokenAddress,
    amount: params.amount,
  }, chainId);
}

/**
 * Get spender address (1inch router)
 */
export async function getSpenderAddress(
  chainId: ChainId = BASE_CHAIN_ID
): Promise<{ address: string }> {
  return makeRequest<{ address: string }>('/approve/spender', {}, chainId);
}

/**
 * Check token allowance
 */
export async function checkAllowance(
  params: AllowanceParams,
  chainId: ChainId = BASE_CHAIN_ID
): Promise<AllowanceResponse> {
  return makeRequest<AllowanceResponse>('/approve/allowance', {
    tokenAddress: params.tokenAddress,
    walletAddress: params.walletAddress,
  }, chainId);
}

/**
 * Get list of supported tokens
 */
export async function getSupportedTokens(
  chainId: ChainId = BASE_CHAIN_ID
): Promise<Record<string, any>> {
  return makeRequest('/tokens', {}, chainId);
}

/**
 * Get liquidity sources
 */
export async function getLiquiditySources(
  chainId: ChainId = BASE_CHAIN_ID
): Promise<{ protocols: any[] }> {
  return makeRequest('/liquidity-sources', {}, chainId);
}

/**
 * Helper: Format token amount to wei
 */
export function toWei(amount: number | string, decimals: number): string {
  const amountStr = String(amount);
  const [whole, fraction = ''] = amountStr.split('.');

  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const wei = whole + paddedFraction;

  return BigInt(wei).toString();
}

/**
 * Helper: Format wei to human-readable amount
 */
export function fromWei(wei: string, decimals: number): string {
  const weiStr = wei.padStart(decimals + 1, '0');
  const whole = weiStr.slice(0, -decimals) || '0';
  const fraction = weiStr.slice(-decimals);

  return `${whole}.${fraction}`.replace(/\.?0+$/, '');
}

/**
 * Helper: Calculate price impact
 */
export function calculatePriceImpact(
  inputAmount: string,
  outputAmount: string,
  marketPrice: number
): number {
  const input = parseFloat(inputAmount);
  const output = parseFloat(outputAmount);
  const expected = input * marketPrice;

  if (expected === 0) return 0;

  return ((expected - output) / expected) * 100;
}
