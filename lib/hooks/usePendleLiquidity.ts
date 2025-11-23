/**
 * Pendle Liquidity Hook
 * 
 * Hook for executing Pendle liquidity operations using wagmi
 */

import { useState } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt, usePublicClient, useAccount } from 'wagmi';
import { type Address } from 'viem';
import { checkApproval, getApprovalTransaction, type ApprovalCheck } from '@/lib/pendle/approvals';

export interface AddLiquidityRequest {
  chainId: number;
  tokenIn: string;
  amountIn: string;
  lpToken: string;
  ytToken?: string;
  receiver: string;
  slippage?: number;
  zpiMode?: boolean;
}

export interface RemoveLiquidityRequest {
  chainId: number;
  lpToken: string;
  amountIn: string;
  tokenOut: string;
  receiver: string;
  slippage?: number;
}

export function usePendleLiquidity() {
  const [liquidityData, setLiquidityData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [approvalChecks, setApprovalChecks] = useState<ApprovalCheck[]>([]);
  const publicClient = usePublicClient();
  const { address } = useAccount();

  // Get transaction data from API
  const getLiquidityTransaction = async (action: 'add' | 'remove', request: AddLiquidityRequest | RemoveLiquidityRequest) => {
    try {
      setError(null);
      const response = await fetch('/api/pendle/liquidity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...request }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get liquidity transaction');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to get liquidity transaction');
      }

      setLiquidityData(result.data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  };

  // Check if approvals are needed
  const checkApprovals = async (txData: any): Promise<ApprovalCheck[]> => {
    if (!publicClient || !address || !txData.requiredApprovals) {
      return [];
    }

    const checks: ApprovalCheck[] = [];
    const routerAddress = txData.tx.to as Address;

    for (const approval of txData.requiredApprovals) {
      const check = await checkApproval(
        approval.token as Address,
        address,
        routerAddress,
        BigInt(approval.amount),
        publicClient
      );
      checks.push(check);
    }

    setApprovalChecks(checks);
    return checks;
  };

  // Send transaction using wagmi
  const { sendTransaction, data: hash, isPending, isSuccess, isError: isSendError } = useSendTransaction();

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isReceiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Execute add liquidity
  const executeAddLiquidity = async (request: AddLiquidityRequest, autoApprove: boolean = true) => {
    try {
      const txData = await getLiquidityTransaction('add', request);

      // Check approvals
      const approvals = await checkApprovals(txData);
      const needsApproval = approvals.some((check) => check.needsApproval);

      if (needsApproval && autoApprove && publicClient && address) {
        // Handle approvals
        for (const approval of approvals.filter((check) => check.needsApproval)) {
          const approvalTx = getApprovalTransaction(approval.token, approval.spender, 'infinite');
          sendTransaction({
            to: approvalTx.to,
            data: approvalTx.data,
            value: approvalTx.value,
          });
        }
      }

      // Send add liquidity transaction
      sendTransaction({
        to: txData.tx.to as Address,
        data: txData.tx.data as `0x${string}`,
        value: BigInt(txData.tx.value || '0'),
      });

      return {
        priceImpact: txData.priceImpact,
        needsApproval,
        approvals,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  };

  // Execute remove liquidity
  const executeRemoveLiquidity = async (request: RemoveLiquidityRequest, autoApprove: boolean = true) => {
    try {
      const txData = await getLiquidityTransaction('remove', request);

      // Check approvals
      const approvals = await checkApprovals(txData);
      const needsApproval = approvals.some((check) => check.needsApproval);

      if (needsApproval && autoApprove && publicClient && address) {
        // Handle approvals
        for (const approval of approvals.filter((check) => check.needsApproval)) {
          const approvalTx = getApprovalTransaction(approval.token, approval.spender, 'infinite');
          sendTransaction({
            to: approvalTx.to,
            data: approvalTx.data,
            value: approvalTx.value,
          });
        }
      }

      // Send remove liquidity transaction
      sendTransaction({
        to: txData.tx.to as Address,
        data: txData.tx.data as `0x${string}`,
        value: BigInt(txData.tx.value || '0'),
      });

      return {
        priceImpact: txData.priceImpact,
        needsApproval,
        approvals,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  };

  return {
    executeAddLiquidity,
    executeRemoveLiquidity,
    getLiquidityTransaction,
    checkApprovals,
    hash,
    isLoading: isPending || isConfirming,
    isSuccess: isConfirmed,
    isError: isSendError || isReceiptError || !!error,
    error: error || null,
    liquidityData,
    approvalChecks,
  };
}

