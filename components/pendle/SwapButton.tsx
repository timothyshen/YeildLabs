'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { usePendleSwap } from '@/lib/hooks/usePendleSwap';
import { BASE_CHAIN_ID } from '@/lib/pendle/config';

interface SwapButtonProps {
  tokenIn: string;
  tokenOut: string;
  amountIn: string; // Amount in wei (string)
  slippage?: number;
  enableAggregator?: boolean;
  className?: string;
  onSuccess?: (hash: string) => void;
  onError?: (error: Error) => void;
}

export function SwapButton({
  tokenIn,
  tokenOut,
  amountIn,
  slippage = 0.01,
  enableAggregator,
  className = '',
  onSuccess,
  onError,
}: SwapButtonProps) {
  const { address } = useAccount();
  const { executeSwap, hash, isLoading, isSuccess, isError, error } = usePendleSwap();
  const [localError, setLocalError] = useState<Error | null>(null);

  const handleSwap = async () => {
    if (!address) {
      const err = new Error('Please connect your wallet');
      setLocalError(err);
      onError?.(err);
      return;
    }

    try {
      setLocalError(null);
      await executeSwap({
        chainId: BASE_CHAIN_ID,
        tokenIn,
        amountIn,
        tokenOut,
        receiver: address,
        slippage,
        enableAggregator,
      });

      if (hash && onSuccess) {
        onSuccess(hash);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Swap failed');
      setLocalError(error);
      onError?.(error);
    }
  };

  if (!address) {
    return (
      <button
        disabled
        className={`px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed ${className}`}
      >
        Connect Wallet
      </button>
    );
  }

  if (isSuccess && hash) {
    return (
      <div className="flex flex-col gap-2">
        <button
          disabled
          className={`px-4 py-2 bg-green-500 text-white rounded-lg cursor-not-allowed ${className}`}
        >
          Swap Successful
        </button>
        <a
          href={`https://basescan.org/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline"
        >
          View on BaseScan
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSwap}
        disabled={isLoading}
        className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed ${className}`}
      >
        {isLoading ? 'Swapping...' : 'Swap'}
      </button>
      {(error || localError) && (
        <p className="text-sm text-red-500">
          {error?.message || localError?.message || 'Swap failed'}
        </p>
      )}
    </div>
  );
}

