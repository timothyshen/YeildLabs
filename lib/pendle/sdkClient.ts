/**
 * Pendle SDK Client
 * 
 * Client for calling Pendle's hosted SDK API
 * Documentation: https://api-v2.pendle.finance/core/docs
 */

export const HOSTED_SDK_URL = 'https://api-v2.pendle.finance/core/';
export const LIMIT_ORDER_URL = 'https://api-v2.pendle.finance/limit-order/';

export interface TokenAmountResponse {
  token: string;
  amount: string;
}

export interface ContractParamInfo {
  method: string;
  contractCallParamsName: string[];
  contractCallParams: any[];
}

export interface TransactionDto {
  data: string;
  to: string;
  from: string;
  value: string;
}

export interface ConvertData {
  priceImpact: number;
  impliedApy?: number;
  effectiveApy?: number;
  paramsBreakdown?: any;
}

export interface RouteResponse {
  contractParamInfo: ContractParamInfo;
  tx: TransactionDto;
  outputs: TokenAmountResponse[];
  data: ConvertData;
}

export interface ConvertResponse {
  action: string;
  inputs: TokenAmountResponse[];
  requiredApprovals?: TokenAmountResponse[];
  routes: RouteResponse[];
}

export interface ConvertParams {
  tokensIn: string;           // Token address(es) - comma-separated for multiple
  amountsIn: string;          // Amount in wei (string)
  tokensOut: string;          // Token address(es) - comma-separated for multiple
  receiver: string;           // Receiver address
  slippage: number;          // Slippage tolerance (0.01 = 1%)
  enableAggregator?: boolean; // Enable aggregator for token swaps
  aggregators?: string;       // Specific aggregator (e.g., 'kyberswap')
  additionalData?: string;   // Additional data fields (e.g., 'impliedApy,effectiveApy')
}

/**
 * Call Pendle SDK API
 */
export async function callSDK<Data = any>(
  path: string,
  params: Record<string, any> = {}
): Promise<{ data: Data; headers: Headers }> {
  const url = new URL(HOSTED_SDK_URL + path);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Pendle SDK API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  const data = await response.json();
  return { data, headers: response.headers };
}

/**
 * Call Pendle Convert API to get transaction data
 */
export async function callConvertAPI(
  chainId: number,
  params: ConvertParams
): Promise<ConvertResponse> {
  const path = `v2/sdk/${chainId}/convert`;
  
  const { data } = await callSDK<ConvertResponse>(path, {
    tokensIn: params.tokensIn,
    amountsIn: params.amountsIn,
    tokensOut: params.tokensOut,
    receiver: params.receiver,
    slippage: params.slippage,
    enableAggregator: params.enableAggregator,
    aggregators: params.aggregators,
    additionalData: params.additionalData,
  });

  return data;
}

/**
 * Get transaction data for a convert operation
 * Returns the first route's transaction data
 */
export async function getTransactionData(
  chainId: number,
  params: ConvertParams
): Promise<{
  tx: TransactionDto;
  priceImpact: number;
  impliedApy?: number;
  effectiveApy?: number;
  outputs: TokenAmountResponse[];
  requiredApprovals?: TokenAmountResponse[];
}> {
  const response = await callConvertAPI(chainId, params);
  
  if (!response.routes || response.routes.length === 0) {
    throw new Error('No routes found in SDK response');
  }

  const route = response.routes[0];
  
  return {
    tx: route.tx,
    priceImpact: route.data.priceImpact,
    impliedApy: route.data.impliedApy,
    effectiveApy: route.data.effectiveApy,
    outputs: route.outputs,
    requiredApprovals: response.requiredApprovals,
  };
}

