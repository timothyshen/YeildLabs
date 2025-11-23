/**
 * Multiple Token Balances Hook
 *
 * Efficiently fetches multiple token balances in a single multicall
 * instead of making separate RPC calls for each token
 */

import { useReadContracts } from 'wagmi';
import { erc20Abi, type Address } from 'viem';
import { useMemo } from 'react';

export interface TokenBalanceRequest {
  tokenAddress: Address | string;
  label: string; // e.g., 'underlying', 'usdc', 'pt', 'yt', 'sy'
}

export interface TokenBalanceResult {
  label: string;
  balance: bigint;
  formatted: number;
  decimals: number;
  isLoading: boolean;
}

export interface UseMultipleTokenBalancesOptions {
  tokens: TokenBalanceRequest[];
  userAddress?: Address | string;
  enabled?: boolean;
}

/**
 * Fetch multiple token balances in a single multicall
 *
 * @example
 * const { balances, isLoading } = useMultipleTokenBalances({
 *   tokens: [
 *     { tokenAddress: '0x123...', label: 'usdc' },
 *     { tokenAddress: '0x456...', label: 'pt' },
 *     { tokenAddress: '0x789...', label: 'yt' },
 *   ],
 *   userAddress: '0xabc...',
 * });
 *
 * // Access by label
 * const usdcBalance = balances.usdc?.formatted || 0;
 */
export function useMultipleTokenBalances({
  tokens,
  userAddress,
  enabled = true,
}: UseMultipleTokenBalancesOptions) {
  // Filter out invalid tokens
  const validTokens = useMemo(
    () => tokens.filter((t) => t.tokenAddress && t.tokenAddress !== '0x' && t.tokenAddress !== '0x0000000000000000000000000000000000000000'),
    [tokens]
  );

  // Build contracts array for multicall
  // For each token, we need both balanceOf and decimals
  const contracts = useMemo(() => {
    if (!userAddress || !enabled || validTokens.length === 0) {
      return [];
    }

    const contractCalls: any[] = [];

    validTokens.forEach((token) => {
      // Add balanceOf call
      contractCalls.push({
        address: token.tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress as Address],
      });

      // Add decimals call
      contractCalls.push({
        address: token.tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'decimals',
      });
    });

    return contractCalls;
  }, [validTokens, userAddress, enabled]);

  // Execute multicall
  const { data, isLoading, isError } = useReadContracts({
    contracts,
    query: {
      enabled: enabled && !!userAddress && contracts.length > 0,
    },
  });

  // Process results into labeled balance objects
  const balances = useMemo(() => {
    if (!data || validTokens.length === 0) {
      // Return empty balances object with all labels
      const emptyBalances: Record<string, TokenBalanceResult> = {};
      tokens.forEach((token) => {
        emptyBalances[token.label] = {
          label: token.label,
          balance: BigInt(0),
          formatted: 0,
          decimals: 18,
          isLoading: isLoading,
        };
      });
      return emptyBalances;
    }

    const results: Record<string, TokenBalanceResult> = {};

    validTokens.forEach((token, index) => {
      // Each token has 2 results: balanceOf and decimals
      const balanceResult = data[index * 2];
      const decimalsResult = data[index * 2 + 1];

      const balance = (balanceResult?.status === 'success' ? balanceResult.result : BigInt(0)) as bigint;
      const decimals = (decimalsResult?.status === 'success' ? decimalsResult.result : 18) as number;
      const formatted = Number(balance) / Math.pow(10, decimals);

      results[token.label] = {
        label: token.label,
        balance,
        formatted,
        decimals,
        isLoading: false,
      };
    });

    return results;
  }, [data, validTokens, tokens, isLoading]);

  return {
    balances,
    isLoading,
    isError,
  };
}

/**
 * Helper hook for common token balance patterns
 * Pre-configured for typical Pendle strategy needs
 */
export function usePendleStrategyBalances({
  underlyingAddress,
  usdcAddress,
  ptAddress,
  ytAddress,
  syAddress,
  userAddress,
  enabled = true,
}: {
  underlyingAddress?: string;
  usdcAddress?: string;
  ptAddress?: string;
  ytAddress?: string;
  syAddress?: string;
  userAddress?: string;
  enabled?: boolean;
}) {
  const tokens: TokenBalanceRequest[] = useMemo(() => {
    const tokenList: TokenBalanceRequest[] = [];

    if (underlyingAddress) {
      tokenList.push({ tokenAddress: underlyingAddress, label: 'underlying' });
    }
    if (usdcAddress) {
      tokenList.push({ tokenAddress: usdcAddress, label: 'usdc' });
    }
    if (ptAddress) {
      tokenList.push({ tokenAddress: ptAddress, label: 'pt' });
    }
    if (ytAddress) {
      tokenList.push({ tokenAddress: ytAddress, label: 'yt' });
    }
    if (syAddress) {
      tokenList.push({ tokenAddress: syAddress, label: 'sy' });
    }

    return tokenList;
  }, [underlyingAddress, usdcAddress, ptAddress, ytAddress, syAddress]);

  return useMultipleTokenBalances({
    tokens,
    userAddress,
    enabled,
  });
}
