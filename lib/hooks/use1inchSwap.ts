/**
 * React hook for 1inch swap operations
 */

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import type { SwapQuote, SwapTransaction } from '@/lib/1inch/types';
import { BASE_CHAIN_ID } from '@/lib/1inch/config';

interface Use1inchSwapOptions {
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export function use1inchSwap(options: Use1inchSwapOptions = {}) {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);

  /**
   * Get swap quote
   */
  const getQuote = useCallback(async (params: {
    fromToken: string;
    toToken: string;
    amount: string;
    fromSymbol?: string;
    toSymbol?: string;
    fromDecimals?: number;
    toDecimals?: number;
    slippage?: number;
    chainId?: number;
  }): Promise<SwapQuote | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        fromToken: params.fromToken,
        toToken: params.toToken,
        amount: params.amount,
        fromDecimals: String(params.fromDecimals || 18),
        toDecimals: String(params.toDecimals || 18),
        slippage: String(params.slippage || 1),
        chainId: String(params.chainId || BASE_CHAIN_ID),
      });

      if (params.fromSymbol) queryParams.append('fromSymbol', params.fromSymbol);
      if (params.toSymbol) queryParams.append('toSymbol', params.toSymbol);

      const response = await fetch(`/api/1inch/quote?${queryParams}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get quote');
      }

      setQuote(data.data);
      return data.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get quote');
      setError(error.message);
      options.onError?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  /**
   * Execute swap
   */
  const executeSwap = useCallback(async (params: {
    fromToken: string;
    toToken: string;
    amount: string;
    fromDecimals?: number;
    slippage?: number;
    chainId?: number;
  }): Promise<string | null> => {
    try {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      // Get swap transaction
      const response = await fetch('/api/1inch/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: params.fromToken,
          toToken: params.toToken,
          amount: params.amount,
          fromAddress: address,
          fromDecimals: params.fromDecimals || 18,
          slippage: params.slippage || 1,
          chainId: params.chainId || BASE_CHAIN_ID,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to prepare swap transaction');
      }

      const transaction: SwapTransaction = data.data;

      // Execute transaction using wagmi/viem
      // This will be handled by the component using sendTransaction
      return transaction.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute swap');
      setError(error.message);
      options.onError?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, options]);

  /**
   * Check token allowance
   */
  const checkAllowance = useCallback(async (params: {
    tokenAddress: string;
    walletAddress?: string;
    chainId?: number;
  }): Promise<string | null> => {
    try {
      const walletAddr = params.walletAddress || address;
      if (!walletAddr) {
        throw new Error('Wallet address not provided');
      }

      const queryParams = new URLSearchParams({
        tokenAddress: params.tokenAddress,
        walletAddress: walletAddr,
        chainId: String(params.chainId || BASE_CHAIN_ID),
      });

      const response = await fetch(`/api/1inch/approve?${queryParams}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to check allowance');
      }

      return data.data.allowance;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check allowance');
      setError(error.message);
      return null;
    }
  }, [address]);

  /**
   * Get approval transaction
   */
  const getApprovalTransaction = useCallback(async (params: {
    tokenAddress: string;
    amount?: string;
    decimals?: number;
    chainId?: number;
  }): Promise<any | null> => {
    try {
      const response = await fetch('/api/1inch/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: params.tokenAddress,
          amount: params.amount,
          decimals: params.decimals || 18,
          chainId: params.chainId || BASE_CHAIN_ID,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get approval transaction');
      }

      return data.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get approval transaction');
      setError(error.message);
      return null;
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setError(null);
    setQuote(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    quote,

    // Actions
    getQuote,
    executeSwap,
    checkAllowance,
    getApprovalTransaction,
    reset,
  };
}
