'use client';

import { useState, useCallback } from 'react';
import { parseUnits } from 'viem';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { usePendleMint } from './usePendleMint';
import { getTokenInfoBySymbol, getTokenInfoByAddress } from '@/lib/utils/tokenAddress';

export type MintFlowState =
  | 'idle'
  | 'preparing'
  | 'approving'
  | 'waiting_approval'
  | 'minting'
  | 'waiting_mint'
  | 'complete';

interface UseMintFlowOptions {
  chainId: number;
  onMintComplete?: (hash: string) => void;
  onError?: (error: Error) => void;
}

interface MintFlowResult {
  flowState: MintFlowState;
  mintHash?: string;
  isMintSuccess: boolean;
  error: Error | null;
  executeMint: (params: {
    tokenIn: string;
    amount: string;
    ptToken: string;
    ytToken: string;
    receiver: string;
    tokenSymbol?: string;
  }) => Promise<void>;
  reset: () => void;
}

async function getTokenDecimals(symbolOrAddress: string, chainId: number = 8453): Promise<number> {
  if (!symbolOrAddress) return 18;

  const isAddress = symbolOrAddress.startsWith('0x') && symbolOrAddress.length === 42;

  let tokenInfo = null;
  if (isAddress) {
    tokenInfo = getTokenInfoByAddress(symbolOrAddress, chainId);
  }

  if (!tokenInfo) {
    tokenInfo = getTokenInfoBySymbol(symbolOrAddress, chainId);
  }

  if (tokenInfo) {
    return tokenInfo.decimals;
  }

  const normalized = symbolOrAddress.toUpperCase();
  if (normalized.includes('USDC') || normalized.includes('USDT')) {
    return 6;
  }

  return 18;
}

export function useMintFlow(options: UseMintFlowOptions): MintFlowResult {
  const { chainId, onMintComplete, onError } = options;

  const [flowState, setFlowState] = useState<MintFlowState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [pendingMintTx, setPendingMintTx] = useState<any>(null);

  const {
    executeMintPy,
    executeMintTx,
    sendTransaction: sendMintApproval,
    isLoading: isMintLoading,
    isSuccess: isMintSuccess,
    hash: mintHash,
    error: mintError,
  } = usePendleMint();

  const reset = useCallback(() => {
    setFlowState('idle');
    setError(null);
    setPendingMintTx(null);
  }, []);

  const executeMint = useCallback(async (params: {
    tokenIn: string;
    amount: string;
    ptToken: string;
    ytToken: string;
    receiver: string;
    tokenSymbol?: string;
  }) => {
    try {
      setError(null);
      setFlowState('preparing');

      // Validate addresses
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;

      if (!params.tokenIn || !addressRegex.test(params.tokenIn)) {
        throw new Error(`Invalid token address: ${params.tokenIn}`);
      }

      if (!params.ptToken || !addressRegex.test(params.ptToken)) {
        throw new Error(`Invalid PT token address: ${params.ptToken}`);
      }

      if (!params.ytToken || !addressRegex.test(params.ytToken)) {
        throw new Error(`Invalid YT token address: ${params.ytToken}`);
      }

      // Get token decimals
      const tokenDecimals = await getTokenDecimals(
        params.tokenIn || params.tokenSymbol || '',
        chainId
      );

      const totalAmountWei = parseUnits(params.amount, tokenDecimals).toString();

      setFlowState('minting');

      const mintResult = await executeMintPy({
        chainId,
        tokenIn: params.tokenIn,
        amountIn: totalAmountWei,
        ptToken: params.ptToken,
        ytToken: params.ytToken,
        receiver: params.receiver,
        slippage: 0.02,
      });

      // Check if approval is needed
      if (mintResult?.needsApproval && mintResult?.approvals && mintResult?.mintTxData) {
        setPendingMintTx(mintResult.mintTxData);
        setFlowState('approving');

        const approval = mintResult.approvals[0];
        const approvalTx = {
          to: approval.token as `0x${string}`,
          data: `0x095ea7b3${approval.spender.slice(2).padStart(64, '0')}${'f'.repeat(64)}` as `0x${string}`,
        };

        sendMintApproval(approvalTx);
        setFlowState('waiting_approval');
        return;
      }

      // Mint transaction was sent successfully
      setFlowState('waiting_mint');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute mint');
      setError(error);
      setFlowState('idle');
      onError?.(error);
    }
  }, [chainId, executeMintPy, sendMintApproval, onError]);

  // Handle mint completion
  if (isMintSuccess && mintHash && flowState === 'waiting_mint') {
    setFlowState('complete');
    onMintComplete?.(mintHash);
  }

  return {
    flowState,
    mintHash,
    isMintSuccess,
    error: error || (mintError ? new Error(mintError.message) : null),
    executeMint,
    reset,
  };
}
