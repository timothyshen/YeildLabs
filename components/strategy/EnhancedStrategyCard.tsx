'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Zap, ArrowLeftRight } from 'lucide-react';
import { parseEther } from 'viem';
import { usePendleMint } from '@/lib/hooks/usePendleMint';
import { usePendleRedeem } from '@/lib/hooks/usePendleRedeem';
import { useAccount } from 'wagmi';
import { useTokenBalance } from '@/lib/hooks/useTokenBalance';
import { useTokenAddress } from '@/lib/hooks/useTokenAddress';
import { useToast } from '@/components/ui/Toast';
import { TokenAddressIndicator } from '@/components/ui/TokenAddressIndicator';
import { use1inchSwap } from '@/lib/hooks/use1inchSwap';
import { SwapPreviewModal } from '@/components/swap/SwapPreviewModal';
import { BASE_TOKENS } from '@/lib/1inch/config';
import type { PendlePool } from '@/types';

interface EnhancedStrategyCardProps {
  poolName: string;
  maturity: string;
  ptPercentage: number; // Calculated ratio (0-1)
  ytPercentage: number; // Calculated ratio (0-1)
  score: number;
  riskFactor: number;
  comment: string;
  apy7d: number;
  apy30d: number;
  pool: PendlePool;
  tokenAddress?: string; // Optional: token address from position/recommendation data
  onDetails?: () => void;
}

export const EnhancedStrategyCard: React.FC<EnhancedStrategyCardProps> = ({
  poolName,
  maturity,
  ptPercentage: defaultPtPercentage,
  ytPercentage: defaultYtPercentage,
  score,
  riskFactor,
  comment,
  apy7d,
  apy30d,
  pool,
  tokenAddress: providedTokenAddress,
  onDetails,
}) => {
  const { address } = useAccount();
  const { executeMintPy, isLoading: isMintLoading, isSuccess: isMintSuccess, hash: mintHash, error: mintError } = usePendleMint();
  const { executeRedeemPy, executeRedeemSy, isLoading: isRedeemLoading, isSuccess: isRedeemSuccess, hash: redeemHash, error: redeemError } = usePendleRedeem();
  const { showToast } = useToast();
  const { quote: swapQuote, isLoading: isSwapLoading, error: swapError, getQuote, executeSwap, reset: resetSwap } = use1inchSwap();

  const [activeTab, setActiveTab] = useState<'invest' | 'redeem'>('invest');
  const [mode, setMode] = useState<'default' | 'advanced'>('default');
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [redeemAmount, setRedeemAmount] = useState<string>('');
  const [ptRatio, setPtRatio] = useState<number>(Math.round(defaultPtPercentage * 100));
  const [ytRatio, setYtRatio] = useState<number>(Math.round(defaultYtPercentage * 100));
  const [profitTake, setProfitTake] = useState<number>(15);
  const [lossCut, setLossCut] = useState<number>(-5);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [isExecutingSwapAndBuy, setIsExecutingSwapAndBuy] = useState(false);

  // Get token symbol from pool
  const tokenSymbol = typeof pool.underlyingAsset === 'string'
    ? pool.underlyingAsset
    : (pool.underlyingAsset as any)?.symbol;

  // Helper to check if a string is an address or a symbol
  const isAddress = (str: string | undefined): boolean => {
    if (!str) return false;
    // Check if it's a valid address format (0x followed by 40 hex chars)
    if (/^0x[a-fA-F0-9]{40}$/.test(str)) return true;
    // Check if it's in "chainId-address" format
    if (str.includes('-')) {
      const addr = str.split('-').pop();
      return addr ? /^0x[a-fA-F0-9]{40}$/.test(addr) : false;
    }
    return false;
  };

  // Priority order for token address:
  // 1. Provided token address (from position/recommendation data)
  // 2. Token address from constants (fetched by symbol)
  // 3. Pool's underlying asset address (if it's actually an address)
  const poolTokenAddress = typeof pool.underlyingAsset === 'string'
    ? pool.underlyingAsset
    : (pool.underlyingAsset as any)?.address;

  // Check if poolTokenAddress is actually an address or just a symbol
  const poolTokenAddressIsValid = poolTokenAddress && isAddress(poolTokenAddress);

  // Only fetch from constants if no provided address and pool address is not valid
  const shouldFetchFromConstants = !providedTokenAddress && !poolTokenAddressIsValid && !!tokenSymbol;
  const { address: tokenAddressFromConstants, isLoading: isLoadingTokenAddress } = useTokenAddress({
    symbol: tokenSymbol,
    chainId: (pool as any).chainId || 8453,
    enabled: shouldFetchFromConstants,
  });

  // Use provided address first, then constants lookup, then pool address (only if valid)
  // Priority: providedTokenAddress > tokenAddressFromConstants > poolTokenAddress (if valid)
  const underlyingTokenAddress = providedTokenAddress || tokenAddressFromConstants || (poolTokenAddressIsValid ? poolTokenAddress : null);
  
  // Debug logging
  React.useEffect(() => {
    if (tokenSymbol) {
      console.log('🔍 [DEBUG] Token address resolution:', {
        tokenSymbol,
        providedTokenAddress,
        tokenAddressFromConstants,
        poolTokenAddress,
        poolTokenAddressIsValid,
        finalAddress: underlyingTokenAddress,
        isValid: underlyingTokenAddress && isAddress(underlyingTokenAddress),
      });
    }
  }, [tokenSymbol, providedTokenAddress, tokenAddressFromConstants, poolTokenAddress, poolTokenAddressIsValid, underlyingTokenAddress]);

  // Validate token address format
  const isValidTokenAddress = underlyingTokenAddress && 
    underlyingTokenAddress !== '0x' && 
    underlyingTokenAddress !== '0x0000000000000000000000000000000000000000' &&
    underlyingTokenAddress.length === 42 &&
    underlyingTokenAddress.startsWith('0x');

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 Balance check debug:', {
      address,
      tokenSymbol,
      poolTokenAddress,
      underlyingTokenAddress,
      isValidTokenAddress,
      isLoadingTokenAddress,
    });
  }, [address, tokenSymbol, poolTokenAddress, underlyingTokenAddress, isValidTokenAddress, isLoadingTokenAddress]);

  // Check user's balance for the underlying token
  const userBalance = useTokenBalance({
    tokenAddress: isValidTokenAddress ? underlyingTokenAddress : undefined,
    userAddress: address,
    enabled: !!address && !!isValidTokenAddress && !isLoadingTokenAddress,
  });

  // Check user's USDC balance for swap option
  const usdcBalance = useTokenBalance({
    tokenAddress: BASE_TOKENS.USDC,
    userAddress: address,
    enabled: !!address,
  });

  // Get PT, YT, and SY token addresses
  const ptTokenAddress = typeof (pool as any).ptToken === 'string' ? (pool as any).ptToken : (pool as any).ptToken?.address;
  const ytTokenAddress = typeof (pool as any).ytToken === 'string' ? (pool as any).ytToken : (pool as any).ytToken?.address;
  const syTokenAddress = typeof (pool as any).syToken === 'string' ? (pool as any).syToken : (pool as any).syToken?.address;

  // Normalize addresses (remove chainId prefix)
  const normalizePtAddress = ptTokenAddress && ptTokenAddress.includes('-') ? ptTokenAddress.split('-').pop() : ptTokenAddress;
  const normalizeYtAddress = ytTokenAddress && ytTokenAddress.includes('-') ? ytTokenAddress.split('-').pop() : ytTokenAddress;
  const normalizeSyAddress = syTokenAddress && syTokenAddress.includes('-') ? syTokenAddress.split('-').pop() : syTokenAddress;

  // Check PT balance
  const ptBalance = useTokenBalance({
    tokenAddress: normalizePtAddress,
    userAddress: address,
    enabled: !!address && !!normalizePtAddress,
  });

  // Check YT balance
  const ytBalance = useTokenBalance({
    tokenAddress: normalizeYtAddress,
    userAddress: address,
    enabled: !!address && !!normalizeYtAddress,
  });

  // Check SY balance
  const syBalance = useTokenBalance({
    tokenAddress: normalizeSyAddress,
    userAddress: address,
    enabled: !!address && !!normalizeSyAddress,
  });

  // Determine if user has redeemable tokens
  const hasRedeemableTokens = (ptBalance.formatted > 0 && ytBalance.formatted > 0) || syBalance.formatted > 0;
  const canRedeemPy = ptBalance.formatted > 0 && ytBalance.formatted > 0;
  const canRedeemSy = syBalance.formatted > 0;

  // Sync ratios when mode changes
  React.useEffect(() => {
    if (mode === 'default') {
      setPtRatio(Math.round(defaultPtPercentage * 100));
      setYtRatio(Math.round(defaultYtPercentage * 100));
    }
  }, [mode, defaultPtPercentage, defaultYtPercentage]);

  // Ensure ratios sum to 100
  React.useEffect(() => {
    if (mode === 'advanced') {
      const total = ptRatio + ytRatio;
      if (total !== 100) {
        const scale = 100 / total;
        setPtRatio(Math.round(ptRatio * scale));
        setYtRatio(Math.round(ytRatio * scale));
      }
    }
  }, [ptRatio, ytRatio, mode]);

  // Calculate amounts
  const calculatedAmounts = useMemo(() => {
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      return { ptAmount: '0', ytAmount: '0', ptAmountFormatted: 0, ytAmountFormatted: 0 };
    }

    const total = parseFloat(investmentAmount);
    const ptAmount = total * (ptRatio / 100);
    const ytAmount = total * (ytRatio / 100);

    return {
      ptAmount: parseEther(ptAmount.toString()).toString(),
      ytAmount: parseEther(ytAmount.toString()).toString(),
      ptAmountFormatted: ptAmount,
      ytAmountFormatted: ytAmount,
    };
  }, [investmentAmount, ptRatio, ytRatio]);

  // Check if user has sufficient balance
  const hasSufficientBalance = useMemo(() => {
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      return true; // No amount entered, don't show error
    }
    if (userBalance.isLoading) {
      return true; // Still loading, don't show error yet
    }
    const requiredAmount = parseFloat(investmentAmount);
    return userBalance.formatted >= requiredAmount;
  }, [investmentAmount, userBalance]);

  // Check if user can swap USDC to get the underlying token
  const canSwapUSDC = useMemo(() => {
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      return false;
    }
    if (!hasSufficientBalance && usdcBalance.formatted > 0) {
      const requiredAmount = parseFloat(investmentAmount);
      // Assuming rough 1:1 conversion for stablecoins (will get exact quote later)
      return usdcBalance.formatted >= requiredAmount;
    }
    return false;
  }, [investmentAmount, hasSufficientBalance, usdcBalance]);

  /**
   * Handle swap from USDC to underlying token and then buy PT/YT
   */
  const handleSwapAndBuy = async () => {
    if (!address || !investmentAmount || !underlyingTokenAddress) return;

    try {
      setIsExecutingSwapAndBuy(true);

      // Get token decimals
      const usdcDecimals = 6; // USDC has 6 decimals
      const underlyingDecimals = 18; // Most tokens have 18 decimals (USDe, WETH, etc.)

      // Get swap quote from USDC to underlying token
      const quote = await getQuote({
        fromToken: BASE_TOKENS.USDC,
        toToken: underlyingTokenAddress,
        amount: investmentAmount,
        fromSymbol: 'USDC',
        toSymbol: tokenSymbol || 'TOKEN',
        fromDecimals: usdcDecimals,
        toDecimals: underlyingDecimals,
        slippage: 1,
        chainId: (pool as any).chainId || 8453,
      });

      if (quote) {
        setShowSwapModal(true);
      }
    } catch (error) {
      console.error('Error getting swap quote:', error);
      showToast({
        type: 'error',
        title: 'Swap Quote Failed',
        message: error instanceof Error ? error.message : 'Failed to get swap quote',
      });
      setIsExecutingSwapAndBuy(false);
    }
  };

  /**
   * Confirm and execute the swap, then buy PT/YT
   */
  const handleConfirmSwap = async () => {
    if (!address || !investmentAmount || !underlyingTokenAddress) return;

    try {
      showToast({
        type: 'loading',
        title: 'Swapping USDC',
        message: 'Please confirm the swap transaction in your wallet...',
        duration: 0,
      });

      // Execute swap from USDC to underlying token
      const swapTxData = await executeSwap({
        fromToken: BASE_TOKENS.USDC,
        toToken: underlyingTokenAddress,
        amount: investmentAmount,
        fromDecimals: 6,
        slippage: 1,
        chainId: (pool as any).chainId || 8453,
      });

      if (!swapTxData) {
        throw new Error('Failed to execute swap');
      }

      // Close modal
      setShowSwapModal(false);
      resetSwap();

      // Show success message
      showToast({
        type: 'success',
        title: 'Swap Successful!',
        message: `Swapped USDC to ${tokenSymbol}. Now executing PT/YT purchase...`,
      });

      // Wait a bit for the swap to settle
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Now execute the buy PT/YT with the swapped tokens
      await handleExecute();
    } catch (error) {
      console.error('Swap and buy error:', error);
      showToast({
        type: 'error',
        title: 'Swap Failed',
        message: error instanceof Error ? error.message : 'Failed to execute swap',
      });
    } finally {
      setIsExecutingSwapAndBuy(false);
    }
  };

  const handleExecute = async () => {
    if (!address) {
      showToast({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to execute the strategy',
      });
      return;
    }

    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid investment amount',
      });
      return;
    }

    if (!hasSufficientBalance) {
      showToast({
        type: 'error',
        title: 'Insufficient Balance',
        message: `You need ${parseFloat(investmentAmount).toFixed(2)} but only have ${userBalance.formatted.toFixed(4)}`,
      });
      return;
    }

    try {
      // Get underlying token address - use provided address or lookup from constants
      let underlyingToken = providedTokenAddress;
      
      // Helper to check if a string is an address or a symbol
      const isAddress = (str: string): boolean => {
        if (!str) return false;
        return /^0x[a-fA-F0-9]{40}$/.test(str) || (str.includes('-') && !!str.split('-').pop()?.match(/^0x[a-fA-F0-9]{40}$/));
      };
      
      if (!underlyingToken || !isAddress(underlyingToken)) {
        // Try to get from pool
        const poolUnderlyingAsset = typeof pool.underlyingAsset === 'string'
          ? pool.underlyingAsset
          : (pool.underlyingAsset as any)?.address;
        
        console.log('🔍 [DEBUG] Getting underlying token address:', {
          providedTokenAddress,
          poolUnderlyingAsset,
          tokenSymbol,
          isProvidedAddress: providedTokenAddress && isAddress(providedTokenAddress),
          isPoolAddress: poolUnderlyingAsset && isAddress(poolUnderlyingAsset),
        });
        
        if (poolUnderlyingAsset && isAddress(poolUnderlyingAsset)) {
          underlyingToken = poolUnderlyingAsset;
        } else {
          // If we got a symbol instead of an address, look it up
          const symbolToLookup = poolUnderlyingAsset || tokenSymbol;
          if (symbolToLookup) {
            const { getTokenAddressBySymbol } = await import('@/lib/utils/tokenAddress');
            const lookedUpAddress = getTokenAddressBySymbol(symbolToLookup, (pool as any).chainId || 8453);
            
            console.log('🔍 [DEBUG] Looked up token address by symbol:', {
              symbol: symbolToLookup,
              foundAddress: lookedUpAddress,
              chainId: (pool as any).chainId || 8453,
              symbolLength: symbolToLookup.length,
            });
            
            if (lookedUpAddress) {
              underlyingToken = lookedUpAddress;
            } else {
              // Lookup failed - try using the hook result if available
              if (tokenAddressFromConstants && isAddress(tokenAddressFromConstants)) {
                underlyingToken = tokenAddressFromConstants;
                console.log('🔍 [DEBUG] Using token address from hook:', underlyingToken);
              }
            }
          }
        }
      }
      
      // Normalize address - remove any chainId prefix
      if (underlyingToken && underlyingToken.includes('-')) {
        underlyingToken = underlyingToken.split('-').pop() || underlyingToken;
      }
      
      // Validate underlying token address
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!underlyingToken || !addressRegex.test(underlyingToken)) {
        console.error('❌ [ERROR] Invalid underlying token address:', {
          underlyingToken,
          tokenSymbol,
          providedTokenAddress,
          poolUnderlyingAsset: typeof pool.underlyingAsset === 'string' ? pool.underlyingAsset : (pool.underlyingAsset as any)?.address,
          tokenAddressFromConstants,
          isSymbol: underlyingToken && !isAddress(underlyingToken),
        });
        showToast({
          type: 'error',
          title: 'Invalid Token Address',
          message: `Could not find token address for "${tokenSymbol || underlyingToken || 'unknown'}". Please check the token configuration.`,
        });
        return;
      }
      
      console.log('✅ [DEBUG] Using underlying token address:', underlyingToken);

      // Get PT and YT token addresses
      let ptToken = typeof (pool as any).ptToken === 'string'
        ? (pool as any).ptToken
        : (pool as any).ptToken?.address;

      let ytToken = typeof (pool as any).ytToken === 'string'
        ? (pool as any).ytToken
        : (pool as any).ytToken?.address;
      
      // Normalize PT/YT addresses
      if (ptToken && ptToken.includes('-')) {
        ptToken = ptToken.split('-').pop() || ptToken;
      }
      if (ytToken && ytToken.includes('-')) {
        ytToken = ytToken.split('-').pop() || ytToken;
      }
      
      // Validate PT and YT addresses
      if (!ptToken || !addressRegex.test(ptToken)) {
        console.error('❌ [ERROR] Invalid PT token address:', ptToken);
        showToast({
          type: 'error',
          title: 'Invalid PT Token Address',
          message: `Invalid PT token address: ${ptToken || 'not found'}`,
        });
        return;
      }
      
      if (!ytToken || !addressRegex.test(ytToken)) {
        console.error('❌ [ERROR] Invalid YT token address:', ytToken);
        showToast({
          type: 'error',
          title: 'Invalid YT Token Address',
          message: `Invalid YT token address: ${ytToken || 'not found'}`,
        });
        return;
      }
      
      console.log('🔍 [DEBUG] Executing mint with addresses:', {
        underlyingToken,
        ptToken,
        ytToken,
        receiver: address,
        amountIn: parseEther(investmentAmount).toString(),
      });

      // Show loading toast
      showToast({
        type: 'loading',
        title: 'Executing Strategy',
        message: 'Please confirm the transaction in your wallet...',
        duration: 0, // Don't auto-dismiss loading toasts
      });

      // Execute mint PT + YT
      // Note: mintPyFromToken mints both PT and YT in equal amounts (1:1 ratio)
      // To achieve custom ratios, we would need to swap after minting
      // For MVP, we'll mint the total amount which gives equal PT + YT
      const totalAmountWei = parseEther(investmentAmount).toString();
      
      await executeMintPy({
        chainId: (pool as any).chainId || 8453,
        tokenIn: underlyingToken,
        amountIn: totalAmountWei,
        ptToken,
        ytToken,
        receiver: address,
        slippage: 0.01,
      });
      
      // TODO: If ratio doesn't match desired ratio, execute swap to adjust
      // For now, minting gives 1:1 ratio, user can swap separately if needed

      // TODO: Store profit take/loss cut settings if advanced mode
      if (mode === 'advanced') {
        // Save to local storage or API
        localStorage.setItem(`strategy_${pool.address}`, JSON.stringify({
          profitTake,
          lossCut,
          ptRatio,
          ytRatio,
        }));
      }
    } catch (err) {
      console.error('Execution error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      showToast({
        type: 'error',
        title: 'Transaction Failed',
        message: errorMessage,
      });
    }
  };

  const handleRedeem = async () => {
    if (!address) {
      showToast({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to redeem tokens',
      });
      return;
    }

    if (!redeemAmount || parseFloat(redeemAmount) <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid redeem amount',
      });
      return;
    }

    try {
      const redeemAmountFloat = parseFloat(redeemAmount);

      // Determine which tokens to redeem
      if (canRedeemPy && redeemAmountFloat <= Math.min(ptBalance.formatted, ytBalance.formatted)) {
        // Redeem PT + YT
        const redeemAmountWei = parseEther(redeemAmount).toString();

        // Normalize PT and YT addresses
        let ptToken = normalizePtAddress;
        let ytToken = normalizeYtAddress;

        if (!ptToken || !ytToken || !underlyingTokenAddress) {
          showToast({
            type: 'error',
            title: 'Missing Token Addresses',
            message: 'Could not find PT, YT, or underlying token addresses',
          });
          return;
        }

        console.log('🔄 Redeeming PT + YT:', {
          ptToken,
          ytToken,
          amount: redeemAmountWei,
          outputToken: underlyingTokenAddress,
        });

        showToast({
          type: 'loading',
          title: 'Redeeming PT + YT',
          message: 'Please confirm the transaction in your wallet...',
          duration: 0,
        });

        await executeRedeemPy({
          chainId: (pool as any).chainId || 8453,
          ptToken,
          ytToken,
          ptAmount: redeemAmountWei,
          ytAmount: redeemAmountWei,
          tokenOut: underlyingTokenAddress,
          receiver: address,
          slippage: 0.01,
        });
      } else if (canRedeemSy && redeemAmountFloat <= syBalance.formatted) {
        // Redeem SY
        const redeemAmountWei = parseEther(redeemAmount).toString();

        let syToken = normalizeSyAddress;

        if (!syToken || !underlyingTokenAddress) {
          showToast({
            type: 'error',
            title: 'Missing Token Addresses',
            message: 'Could not find SY or underlying token addresses',
          });
          return;
        }

        console.log('🔄 Redeeming SY:', {
          syToken,
          amount: redeemAmountWei,
          outputToken: underlyingTokenAddress,
        });

        showToast({
          type: 'loading',
          title: 'Redeeming SY',
          message: 'Please confirm the transaction in your wallet...',
          duration: 0,
        });

        await executeRedeemSy({
          chainId: (pool as any).chainId || 8453,
          syToken,
          syAmount: redeemAmountWei,
          tokenOut: underlyingTokenAddress,
          receiver: address,
          slippage: 0.01,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Insufficient Balance',
          message: 'You do not have enough tokens to redeem',
        });
      }
    } catch (err) {
      console.error('Redeem error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Redeem transaction failed';
      showToast({
        type: 'error',
        title: 'Redeem Failed',
        message: errorMessage,
      });
    }
  };

  // Show success/error notifications for mint
  React.useEffect(() => {
    if (isMintSuccess && mintHash) {
      showToast({
        type: 'success',
        title: 'Strategy Executed Successfully!',
        message: `Transaction confirmed. PT + YT tokens minted.`,
        action: {
          label: 'View on BaseScan',
          onClick: () => {
            window.open(`https://basescan.org/tx/${mintHash}`, '_blank');
          },
        },
      });
    }
  }, [isMintSuccess, mintHash, showToast]);

  React.useEffect(() => {
    if (mintError) {
      showToast({
        type: 'error',
        title: 'Transaction Error',
        message: mintError.message || 'An error occurred during execution',
      });
    }
  }, [mintError, showToast]);

  // Show success/error notifications for redeem
  React.useEffect(() => {
    if (isRedeemSuccess && redeemHash) {
      showToast({
        type: 'success',
        title: 'Redeem Successful!',
        message: `Transaction confirmed. Tokens redeemed to ${tokenSymbol}.`,
        action: {
          label: 'View on BaseScan',
          onClick: () => {
            window.open(`https://basescan.org/tx/${redeemHash}`, '_blank');
          },
        },
      });
    }
  }, [isRedeemSuccess, redeemHash, tokenSymbol, showToast]);

  React.useEffect(() => {
    if (redeemError) {
      showToast({
        type: 'error',
        title: 'Redeem Error',
        message: redeemError.message || 'An error occurred during redemption',
      });
    }
  }, [redeemError, showToast]);

  const handleRatioChange = (newPtRatio: number) => {
    if (mode === 'advanced') {
      setPtRatio(newPtRatio);
      setYtRatio(100 - newPtRatio);
    }
  };

  return (
    <Card className="w-full border rounded-2xl shadow-sm p-4 bg-white dark:bg-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{poolName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Maturity: {maturity}</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span
                className="font-semibold text-lg"
                style={{
                  color: score > 80 ? '#059669' : score > 60 ? '#d97706' : '#dc2626',
                }}
              >
                Score: {score}
              </span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'default' | 'advanced')}
                className="text-xs px-2 py-1 border rounded-lg bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="default">Default</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              Risk: {(riskFactor * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
        <button
          onClick={() => setActiveTab('invest')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'invest'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Invest</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('redeem')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'redeem'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          disabled={!hasRedeemableTokens}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            <span>Redeem</span>
            {hasRedeemableTokens && (
              <span className="ml-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">
                ✓
              </span>
            )}
          </div>
        </button>
      </div>

      <CardContent className="mt-2">
        {/* Invest Tab */}
        {activeTab === 'invest' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">{comment}</p>

            {/* PT/YT Ratio Display */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="text-gray-700 dark:text-gray-300">
              PT {ptRatio}%
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              YT {ytRatio}%
            </span>
          </div>
          
          {mode === 'default' ? (
            <Progress value={ytRatio} className="h-2" />
          ) : (
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={ptRatio}
                onChange={(e) => handleRatioChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <Progress value={ytRatio} className="h-2" />
            </div>
          )}
        </div>

        {/* Advanced Mode Settings */}
        {mode === 'advanced' && (
          <div className="mt-4 space-y-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Profit Take:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={profitTake}
                  onChange={(e) => setProfitTake(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:text-white"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Loss Cut:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="-100"
                  max="0"
                  value={lossCut}
                  onChange={(e) => setLossCut(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:text-white"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
          </div>
        )}

        {/* APY Metrics */}
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
            <p className="text-gray-500 dark:text-gray-400">APY (7D)</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {(apy7d * 100).toFixed(2)}%
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
            <p className="text-gray-500 dark:text-gray-400">APY (30D)</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {(apy30d * 100).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Investment Amount Input */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Investment Amount (USD)
          </label>
          <input
            type="number"
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Balance Display */}
        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Your Balance:</span>
              {isLoadingTokenAddress ? (
                <span className="text-xs text-gray-400">Loading token address...</span>
              ) : underlyingTokenAddress ? (
                <TokenAddressIndicator
                  address={underlyingTokenAddress}
                  symbol={tokenSymbol}
                />
              ) : null}
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {!address ? (
                <span className="text-gray-400 text-xs">Connect wallet</span>
              ) : isLoadingTokenAddress ? (
                <span className="text-gray-400 text-xs">Fetching token address...</span>
              ) : !isValidTokenAddress ? (
                <span className="text-gray-400 text-xs">
                  {underlyingTokenAddress ? 'Invalid token address' : 'Token address not available'}
                </span>
              ) : userBalance.isLoading ? (
                <span className="text-gray-400">Loading balance...</span>
              ) : (
                `${userBalance.formatted.toFixed(4)} ${tokenSymbol || 'TOKEN'}`
              )}
            </span>
          </div>

          {/* Show USDC balance when swap is possible */}
          {address && canSwapUSDC && (
            <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">USDC Balance:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {usdcBalance.formatted.toFixed(2)} USDC
              </span>
            </div>
          )}
        </div>

        {/* Calculated Amounts Preview */}
        {investmentAmount && parseFloat(investmentAmount) > 0 && (
          <div className={`mt-3 p-3 rounded-lg ${
            hasSufficientBalance 
              ? 'bg-blue-50 dark:bg-blue-900/20' 
              : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Will Buy:
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">PT:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${calculatedAmounts.ptAmountFormatted.toFixed(2)} ({ptRatio}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">YT:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${calculatedAmounts.ytAmountFormatted.toFixed(2)} ({ytRatio}%)
                </span>
              </div>
            </div>
            {!hasSufficientBalance && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                ⚠️ Insufficient balance. You need ${parseFloat(investmentAmount).toFixed(2)} but only have ${userBalance.formatted.toFixed(4)}.
                {canSwapUSDC && (
                  <span className="block text-purple-600 dark:text-purple-400 mt-1">
                    💡 You can swap USDC to get the required amount
                  </span>
                )}
              </p>
            )}
          </div>
        )}
          </>
        )}

        {/* Redeem Tab */}
        {activeTab === 'redeem' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Redeem your PT/YT or SY tokens back to {tokenSymbol || 'underlying token'}
            </p>

            {/* Holdings Display */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Your Holdings:
              </p>
              <div className="space-y-2 text-sm">
                {canRedeemPy && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">PT:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {ptBalance.formatted.toFixed(4)} PT-{tokenSymbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">YT:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {ytBalance.formatted.toFixed(4)} YT-{tokenSymbol}
                      </span>
                    </div>
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                      💡 You can redeem up to {Math.min(ptBalance.formatted, ytBalance.formatted).toFixed(4)} {tokenSymbol}
                    </div>
                  </>
                )}
                {canRedeemSy && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">SY:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {syBalance.formatted.toFixed(4)} SY-{tokenSymbol}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Redeem Amount Input */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Redeem Amount
              </label>
              <input
                type="number"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                placeholder="0.00"
                max={
                  canRedeemPy
                    ? Math.min(ptBalance.formatted, ytBalance.formatted)
                    : syBalance.formatted
                }
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {canRedeemPy
                  ? `Max: ${Math.min(ptBalance.formatted, ytBalance.formatted).toFixed(4)} (PT + YT)`
                  : canRedeemSy
                  ? `Max: ${syBalance.formatted.toFixed(4)} (SY)`
                  : 'No tokens available to redeem'}
              </p>
            </div>

            {/* Output Preview */}
            {redeemAmount && parseFloat(redeemAmount) > 0 && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  You will receive:
                </p>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{tokenSymbol}:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ≈ {parseFloat(redeemAmount).toFixed(4)} {tokenSymbol}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  * Actual amount may vary slightly due to slippage
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center mt-4">
        <Button
          className="text-gray-700 dark:text-gray-300 border rounded-xl px-3"
          variant="outline"
          onClick={onDetails}
        >
          More <ArrowRight className="w-4 ml-1" />
        </Button>

        {activeTab === 'invest' ? (
          <Button
            className={`rounded-xl px-6 py-2 font-medium flex items-center gap-2 disabled:opacity-50 ${
              canSwapUSDC
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : !hasSufficientBalance && address && investmentAmount
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            onClick={canSwapUSDC ? handleSwapAndBuy : handleExecute}
            disabled={
              !address ||
              !investmentAmount ||
              parseFloat(investmentAmount) <= 0 ||
              isMintLoading ||
              isExecutingSwapAndBuy ||
              (!hasSufficientBalance && !canSwapUSDC) ||
              userBalance.isLoading
            }
          >
            {isMintLoading || isExecutingSwapAndBuy ? (
              <>
                <Zap className="w-4 h-4 animate-pulse" />
                {isExecutingSwapAndBuy ? 'Getting Quote...' : 'Executing...'}
              </>
            ) : canSwapUSDC ? (
              <>
                <ArrowLeftRight className="w-4 h-4" />
                Swap & Buy
              </>
            ) : !hasSufficientBalance && address && investmentAmount ? (
              <>
                <Zap className="w-4 h-4" />
                Insufficient Balance
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Execute Strategy
              </>
            )}
          </Button>
        ) : (
          <Button
            className="rounded-xl px-6 py-2 font-medium flex items-center gap-2 disabled:opacity-50 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleRedeem}
            disabled={
              !address ||
              !redeemAmount ||
              parseFloat(redeemAmount) <= 0 ||
              isRedeemLoading ||
              (!canRedeemPy && !canRedeemSy)
            }
          >
            {isRedeemLoading ? (
              <>
                <ArrowLeftRight className="w-4 h-4 animate-pulse" />
                Redeeming...
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4" />
                Redeem Tokens
              </>
            )}
          </Button>
        )}
      </CardFooter>

      {/* Success/Error Messages */}
      {isMintSuccess && mintHash && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✅ Strategy executed!{' '}
            <a
              href={`https://basescan.org/tx/${mintHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View Transaction
            </a>
          </p>
        </div>
      )}

      {isRedeemSuccess && redeemHash && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✅ Redeem successful!{' '}
            <a
              href={`https://basescan.org/tx/${redeemHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View Transaction
            </a>
          </p>
        </div>
      )}

      {mintError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            ❌ Error: {mintError.message}
          </p>
        </div>
      )}

      {redeemError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            ❌ Redeem Error: {redeemError.message}
          </p>
        </div>
      )}

      {/* Swap Preview Modal */}
      <SwapPreviewModal
        isOpen={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          resetSwap();
          setIsExecutingSwapAndBuy(false);
        }}
        onConfirm={handleConfirmSwap}
        quote={swapQuote}
        isLoading={isSwapLoading}
        error={swapError}
      />
    </Card>
  );
};

