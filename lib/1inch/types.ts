/**
 * 1inch API Types
 * Based on 1inch API v6.0 specification
 */

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

export interface QuoteParams {
  src: string;           // Source token address
  dst: string;           // Destination token address
  amount: string;        // Amount in smallest units (e.g., wei for ETH)
  from?: string;         // User's wallet address (optional for quotes)
  slippage?: number;     // Slippage tolerance (1-50)
  protocols?: string;    // Liquidity sources to use
  fee?: number;          // Platform fee (0-3%)
  gasPrice?: string;     // Gas price in wei
  complexityLevel?: number; // Routing complexity (0-3)
  parts?: number;        // Number of parts to split (1-100)
  mainRouteParts?: number; // Parts for main route
  gasLimit?: number;     // Gas limit
  includeTokensInfo?: boolean; // Include token info in response
  includeProtocols?: boolean;  // Include protocols in response
  includeGas?: boolean;  // Include gas estimate
  connectorTokens?: string; // Comma-separated connector token addresses
}

export interface SwapParams extends QuoteParams {
  from: string;          // User's wallet address (required for swap)
  receiver?: string;     // Receiver address (default: from)
  referrer?: string;     // Referrer address
  allowPartialFill?: boolean; // Allow partial fill
  disableEstimate?: boolean;  // Disable gas estimate
  permit?: string;       // Permit signature
}

export interface QuoteResponse {
  dstAmount: string;     // Destination token amount (in smallest units)
  srcAmount?: string;    // Source token amount (may differ from input due to rounding)
  protocols?: Protocol[]; // Protocols used
  gas?: number;          // Estimated gas
  estimatedGas?: number; // Estimated gas (deprecated, use gas)
}

export interface SwapResponse {
  dstAmount: string;     // Destination token amount
  tx: {
    from: string;        // Sender address
    to: string;          // 1inch router address
    data: string;        // Transaction data
    value: string;       // ETH value to send
    gas: number;         // Gas limit
    gasPrice: string;    // Gas price
  };
}

export interface Protocol {
  name: string;
  part: number;          // Percentage of the swap (0-100)
  fromTokenAddress: string;
  toTokenAddress: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  eip2612?: boolean;     // Supports permit
  tags?: string[];
}

export interface SwapQuote {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;    // Human-readable amount
  toAmount: string;      // Human-readable amount
  fromAmountWei: string; // Amount in wei
  toAmountWei: string;   // Amount in wei
  protocols: Protocol[];
  estimatedGas: number;
  priceImpact?: number;  // Price impact percentage
  slippage: number;
  executionPrice: string; // Price per token
}

export interface SwapTransaction {
  to: string;
  data: string;
  value: string;
  gas: number;
  gasPrice: string;
  from: string;
}

export interface SwapState {
  isLoading: boolean;
  error: string | null;
  quote: SwapQuote | null;
  transaction: SwapTransaction | null;
}

// Error types
export interface OneInchError {
  statusCode: number;
  error: string;
  description: string;
  requestId?: string;
  meta?: Array<{
    type: string;
    value: string;
  }>;
}

// Approval types
export interface ApprovalParams {
  tokenAddress: string;
  amount?: string; // Optional, defaults to unlimited
}

export interface ApprovalResponse {
  data: string;      // Transaction data
  gasPrice: string;
  to: string;        // Token contract address
  value: string;     // Should be "0"
}

export interface AllowanceParams {
  tokenAddress: string;
  walletAddress: string;
}

export interface AllowanceResponse {
  allowance: string; // Current allowance in wei
}
