/**
 * Pendle Mint Hook
 * 
 * Hook for executing Pendle mint operations using wagmi
 */

import { useState } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt, usePublicClient, useAccount } from 'wagmi';
import { type Address } from 'viem';
import { checkApproval, getApprovalTransaction, type ApprovalCheck } from '@/lib/pendle/approvals';

export interface MintSyRequest {
  chainId: number;
  tokenIn: string;
  amountIn: string;
  syToken: string;
  receiver: string;
  slippage?: number;
}

export interface MintPyRequest {
  chainId: number;
  tokenIn: string;
  amountIn: string;
  ptToken: string;
  ytToken: string;
  receiver: string;
  slippage?: number;
}

export function usePendleMint() {
  const [mintData, setMintData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [approvalChecks, setApprovalChecks] = useState<ApprovalCheck[]>([]);
  const publicClient = usePublicClient();
  const { address } = useAccount();

  // Get transaction data from API
  const getMintTransaction = async (type: 'sy' | 'py', request: MintSyRequest | MintPyRequest) => {
    try {
      setError(null);
      const response = await fetch('/api/pendle/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, ...request }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get mint transaction');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to get mint transaction');
      }

      setMintData(result.data);
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

  // Execute mint SY
  const executeMintSy = async (request: MintSyRequest, autoApprove: boolean = true) => {
    try {
      const txData = await getMintTransaction('sy', request);

      // Check approvals
      const approvals = await checkApprovals(txData);
      const needsApproval = approvals.some((check) => check.needsApproval);

      if (needsApproval && autoApprove && publicClient && address) {
        // Handle approvals (similar to swap)
        for (const approval of approvals.filter((check) => check.needsApproval)) {
          const approvalTx = getApprovalTransaction(approval.token, approval.spender, 'infinite');
          sendTransaction({
            to: approvalTx.to,
            data: approvalTx.data,
            value: approvalTx.value,
          });
        }
      }

      // Send mint transaction
      // Safely parse value - handle both string and number formats
      const txValueSy = txData.tx.value || '0';
      const parsedValueSy = typeof txValueSy === 'object' && txValueSy !== null && 'toString' in txValueSy
        ? BigInt((txValueSy as any).toString())
        : BigInt(txValueSy);

      console.log('🔍 [DEBUG] Mint SY transaction params:', {
        to: txData.tx.to,
        value: txValueSy,
        valueType: typeof txValueSy,
        parsedValue: parsedValueSy.toString(),
      });

      sendTransaction({
        to: txData.tx.to as Address,
        data: txData.tx.data as `0x${string}`,
        value: parsedValueSy,
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

  // Execute mint PT/YT
  const executeMintPy = async (request: MintPyRequest, autoApprove: boolean = true) => {
    try {
      const txData = await getMintTransaction('py', request);

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

      // Send mint transaction
      // Safely parse value - handle both string and number formats
      const txValuePy = txData.tx.value || '0';
      const parsedValuePy = typeof txValuePy === 'object' && txValuePy !== null && 'toString' in txValuePy
        ? BigInt((txValuePy as any).toString())
        : BigInt(txValuePy);

      console.log('🔍 [DEBUG] Mint PT/YT transaction params:', {
        to: txData.tx.to,
        value: txValuePy,
        valueType: typeof txValuePy,
        parsedValue: parsedValuePy.toString(),
      });

      sendTransaction({
        to: txData.tx.to as Address,
        data: txData.tx.data as `0x${string}`,
        value: parsedValuePy,
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
    executeMintSy,
    executeMintPy,
    getMintTransaction,
    checkApprovals,
    hash,
    isLoading: isPending || isConfirming,
    isSuccess: isConfirmed,
    isError: isSendError || isReceiptError || !!error,
    error: error || null,
    mintData,
    approvalChecks,
  };
}

