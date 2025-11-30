'use client';

import { useState, useCallback } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { use1inchSwap } from './use1inchSwap';
import { BASE_TOKENS } from '@/lib/1inch/config';

export type SwapFlowState =
  | 'idle'
  | 'checking_allowance'
  | 'approving'
  | 'waiting_approval'
  | 'swapping'
  | 'waiting_swap'
  | 'complete';

interface UseSwapFlowOptions {
  chainId: number;
  onSwapComplete?: (hash: string) => void;
  onError?: (error: Error) => void;
}

interface SwapFlowResult {
  flowState: SwapFlowState;
  approvalHash?: string;
  swapHash?: string;
  isApprovalConfirmed: boolean;
  isSwapConfirmed: boolean;
  error: Error | null;
  startSwapFlow: (params: {
    fromToken: string;
    toToken: string;
    amount: string;
    fromSymbol: string;
    toSymbol: string;
    fromDecimals: number;
    toDecimals: number;
    walletAddress: string;
  }) => Promise<void>;
  executeApproval: (params: {
    tokenAddress: string;
    amount: string;
    decimals: number;
  }) => Promise<void>;
  executeSwap: (params: {
    fromToken: string;
    toToken: string;
    amount: string;
    walletAddress: string;
    fromDecimals: number;
  }) => Promise<void>;
  reset: () => void;
}

export function useSwapFlow(options: UseSwapFlowOptions): SwapFlowResult {
  const { chainId, onSwapComplete, onError } = options;

  const [flowState, setFlowState] = useState<SwapFlowState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const {
    quote: swapQuote,
    isLoading: isSwapLoading,
    error: swapError,
    getQuote,
    checkAllowance,
    getApprovalTransaction,
    reset: resetSwap,
  } = use1inchSwap();

  // Approval transaction
  const {
    sendTransaction: sendApproval,
    data: approvalHash,
    isPending: isApprovePending,
    error: approvalSendError,
  } = useSendTransaction();

  const {
    isSuccess: isApprovalConfirmed,
    isLoading: isApprovalConfirming,
    isError: isApprovalError,
    error: approvalReceiptError,
  } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  // Swap transaction
  const {
    sendTransaction: sendSwap,
    data: swapHash,
    isPending: isSwapPending,
    error: swapSendError,
  } = useSendTransaction();

  const {
    isSuccess: isSwapConfirmed,
    isError: isSwapError,
    error: swapReceiptError,
  } = useWaitForTransactionReceipt({
    hash: swapHash,
  });

  const reset = useCallback(() => {
    setFlowState('idle');
    setError(null);
    resetSwap();
  }, [resetSwap]);

  const startSwapFlow = useCallback(async (params: {
    fromToken: string;
    toToken: string;
    amount: string;
    fromSymbol: string;
    toSymbol: string;
    fromDecimals: number;
    toDecimals: number;
    walletAddress: string;
  }) => {
    try {
      setError(null);
      setFlowState('checking_allowance');

      // Get quote first
      await getQuote({
        fromToken: params.fromToken,
        toToken: params.toToken,
        amount: params.amount,
        fromSymbol: params.fromSymbol,
        toSymbol: params.toSymbol,
        fromDecimals: params.fromDecimals,
        toDecimals: params.toDecimals,
        slippage: 2,
        chainId,
      });

      // Check allowance
      const allowance = await checkAllowance({
        tokenAddress: params.fromToken,
        walletAddress: params.walletAddress,
        chainId,
      });

      const amountInTokenUnits = Math.floor(parseFloat(params.amount) * Math.pow(10, params.fromDecimals));

      if (!allowance || BigInt(allowance) < BigInt(amountInTokenUnits)) {
        setFlowState('approving');
        return; // Caller should call executeApproval
      }

      // Skip to swap if already approved
      setFlowState('swapping');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start swap flow');
      setError(error);
      setFlowState('idle');
      onError?.(error);
    }
  }, [chainId, getQuote, checkAllowance, onError]);

  const executeApproval = useCallback(async (params: {
    tokenAddress: string;
    amount: string;
    decimals: number;
  }) => {
    try {
      const approvalResponse = await getApprovalTransaction({
        tokenAddress: params.tokenAddress,
        amount: params.amount,
        decimals: params.decimals,
        chainId,
      });

      if (!approvalResponse?.tx) {
        throw new Error('Failed to get approval transaction');
      }

      const approvalTxParams: { to: `0x${string}`; data: `0x${string}`; value?: bigint; gas?: bigint } = {
        to: approvalResponse.tx.to as `0x${string}`,
        data: approvalResponse.tx.data as `0x${string}`,
      };

      if (approvalResponse.tx.value && BigInt(approvalResponse.tx.value) > BigInt(0)) {
        approvalTxParams.value = BigInt(approvalResponse.tx.value);
      }

      if (approvalResponse.tx.gas) {
        approvalTxParams.gas = BigInt(approvalResponse.tx.gas);
      }

      sendApproval(approvalTxParams);
      setFlowState('waiting_approval');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute approval');
      setError(error);
      setFlowState('idle');
      onError?.(error);
    }
  }, [chainId, getApprovalTransaction, sendApproval, onError]);

  const executeSwap = useCallback(async (params: {
    fromToken: string;
    toToken: string;
    amount: string;
    walletAddress: string;
    fromDecimals: number;
  }) => {
    try {
      setFlowState('swapping');

      const swapResponse = await fetch('/api/1inch/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: params.fromToken,
          toToken: params.toToken,
          amount: params.amount,
          fromAddress: params.walletAddress,
          fromDecimals: params.fromDecimals,
          slippage: 2,
          chainId,
        }),
      });

      const swapData = await swapResponse.json();

      if (!swapData.success || !swapData.data) {
        throw new Error(swapData.error || 'Failed to get swap transaction');
      }

      const swapTx = swapData.data;
      const swapTxParams: { to: `0x${string}`; data: `0x${string}`; value?: bigint; gas?: bigint } = {
        to: swapTx.to as `0x${string}`,
        data: swapTx.data as `0x${string}`,
      };

      if (swapTx.value && BigInt(swapTx.value) > BigInt(0)) {
        swapTxParams.value = BigInt(swapTx.value);
      }

      if (swapTx.gas) {
        swapTxParams.gas = BigInt(swapTx.gas);
      }

      sendSwap(swapTxParams);
      setFlowState('waiting_swap');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute swap');
      setError(error);
      setFlowState('idle');
      onError?.(error);
    }
  }, [chainId, sendSwap, onError]);

  return {
    flowState,
    approvalHash,
    swapHash,
    isApprovalConfirmed,
    isSwapConfirmed,
    error: error || (approvalSendError ? new Error(approvalSendError.message) : null) ||
           (swapSendError ? new Error(swapSendError.message) : null),
    startSwapFlow,
    executeApproval,
    executeSwap,
    reset,
  };
}
