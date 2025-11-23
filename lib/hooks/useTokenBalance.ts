/**
 * Token Balance Hook
 * 
 * Hook for checking token balances using wagmi
 */

import { useReadContract, useBalance } from 'wagmi';
import { erc20Abi, type Address } from 'viem';
import { useMemo } from 'react';

export interface UseTokenBalanceOptions {
  tokenAddress?: Address | string;
  userAddress?: Address | string;
  enabled?: boolean;
}

export function useTokenBalance({
  tokenAddress,
  userAddress,
  enabled = true,
}: UseTokenBalanceOptions) {
  const isNativeToken = !tokenAddress || tokenAddress === '0x' || tokenAddress === '0x0000000000000000000000000000000000000000';

  // For native token (ETH), use useBalance
  const { data: nativeBalance, isLoading: isLoadingNative } = useBalance({
    address: userAddress as Address,
    enabled: enabled && isNativeToken && !!userAddress,
  });

  // For ERC20 tokens, use useReadContract
  const { data: tokenBalance, isLoading: isLoadingToken } = useReadContract({
    address: tokenAddress as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as Address] : undefined,
    enabled: enabled && !isNativeToken && !!tokenAddress && !!userAddress,
  });

  // Get decimals for ERC20 tokens
  const { data: decimals } = useReadContract({
    address: tokenAddress as Address,
    abi: erc20Abi,
    functionName: 'decimals',
    enabled: enabled && !isNativeToken && !!tokenAddress,
  });

  const balance = useMemo(() => {
    if (isNativeToken) {
      return {
        raw: nativeBalance?.value || 0n,
        formatted: parseFloat(nativeBalance?.formatted || '0'),
        decimals: 18,
        isLoading: isLoadingNative,
      };
    }

    const rawBalance = (tokenBalance as bigint) || 0n;
    const tokenDecimals = decimals || 18;
    const formatted = Number(rawBalance) / Math.pow(10, tokenDecimals);

    return {
      raw: rawBalance,
      formatted,
      decimals: tokenDecimals,
      isLoading: isLoadingToken,
    };
  }, [isNativeToken, nativeBalance, tokenBalance, decimals, isLoadingNative, isLoadingToken]);

  return balance;
}

