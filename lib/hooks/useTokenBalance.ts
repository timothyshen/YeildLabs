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
    query: {
      enabled: enabled && isNativeToken && !!userAddress,
    },
  });

  // For ERC20 tokens, use useReadContract
  const { data: tokenBalance, isLoading: isLoadingToken } = useReadContract({
    address: tokenAddress as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as Address] : undefined,
    query: {
      enabled: enabled && !isNativeToken && !!tokenAddress && !!userAddress,
    },
  });

  // Get decimals for ERC20 tokens
  const { data: decimals } = useReadContract({
    address: tokenAddress as Address,
    abi: erc20Abi,
    functionName: 'decimals',
    query: {
      enabled: enabled && !isNativeToken && !!tokenAddress,
    },
  });

  const balance = useMemo(() => {
    if (isNativeToken) {
      const rawValue = nativeBalance?.value || BigInt(0);
      const decimalsValue = nativeBalance?.decimals || 18;
      const formattedValue = Number(rawValue) / Math.pow(10, decimalsValue);
      return {
        raw: rawValue,
        formatted: formattedValue,
        decimals: decimalsValue,
        isLoading: isLoadingNative,
      };
    }

    const rawBalance = (tokenBalance as bigint) || BigInt(0);
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

