'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Zap, ArrowLeftRight } from 'lucide-react';
import { parseEther, parseUnits } from 'viem';
import { usePendleMint } from '@/lib/hooks/usePendleMint';
import { usePendleRedeem } from '@/lib/hooks/usePendleRedeem';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { usePendleStrategyBalances } from '@/lib/hooks/useMultipleTokenBalances';
import { useTokenAddress } from '@/lib/hooks/useTokenAddress';
import { useToast } from '@/components/ui/Toast';
import { TokenAddressIndicator } from '@/components/ui/TokenAddressIndicator';
import { use1inchSwap } from '@/lib/hooks/use1inchSwap';
import { SwapPreviewModal } from '@/components/swap/SwapPreviewModal';
import { BASE_TOKENS } from '@/lib/1inch/config';
import type { PendlePool } from '@/types';
import { normalizeAddress, isValidAddress } from '@/lib/utils/address';

// Safe logging helper to avoid cross-origin errors
const safeLog = (message: string, data: any) => {
  try {
    // Create a clean copy without circular references or Window objects
    const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
      // Filter out functions and Window objects
      if (typeof value === 'function' || value instanceof Window) {
        return '[Filtered]';
      }
      return value;
    }));
    console.log(message, cleanData);
  } catch (error) {
    // If serialization fails, just log the message
    console.log(message, '[Unable to serialize data]');
  }
};

// Get token decimals based on symbol or address
const getTokenDecimals = async (symbolOrAddress: string, chainId: number = 8453): Promise<number> => {
  if (!symbolOrAddress) return 18; // Default to 18 decimals

  // Import the token utility
  const { getTokenInfoBySymbol, getTokenInfoByAddress } = await import('@/lib/utils/tokenAddress');

  // Check if it's an address (starts with 0x and has 40 hex chars after)
  const isAddress = symbolOrAddress.startsWith('0x') && symbolOrAddress.length === 42;

  // Try to get token info from our constants
  let tokenInfo = null;

  if (isAddress) {
    // Look up by address first
    tokenInfo = getTokenInfoByAddress(symbolOrAddress, chainId);
  }

  if (!tokenInfo) {
    // Try looking up by symbol
    tokenInfo = getTokenInfoBySymbol(symbolOrAddress, chainId);
  }

  if (tokenInfo) {
    console.log('✅ Found token decimals:', {
      input: symbolOrAddress,
      symbol: tokenInfo.symbol,
      decimals: tokenInfo.decimals
    });
    return tokenInfo.decimals;
  }

  // Fallback: USDC and USDT typically use 6 decimals
  const normalized = symbolOrAddress.toUpperCase();
  if (normalized.includes('USDC') || normalized.includes('USDT')) {
    console.log('⚠️ Using fallback decimals for USDC/USDT: 6');
    return 6;
  }

  // Default to 18 decimals for most ERC20 tokens
  console.log('⚠️ Using default decimals: 18 for', symbolOrAddress);
  return 18;
};

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
  onSuccess?: () => void; // Callback to refresh data after successful execution
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
  onSuccess,
}) => {
  const { address } = useAccount();
  const {
    executeMintPy,
    executeMintTx,
    sendTransaction: sendMintApproval,
    isLoading: isMintLoading,
    isSuccess: isMintSuccess,
    hash: mintHash,
    error: mintError
  } = usePendleMint();
  const { executeRedeemPy, executeRedeemSy, isLoading: isRedeemLoading, isSuccess: isRedeemSuccess, hash: redeemHash, error: redeemError } = usePendleRedeem();
  const { showToast, removeToast } = useToast();

  // State for tracking mint approval flow
  const [pendingMintTx, setPendingMintTx] = useState<any>(null);
  const [isWaitingForMintApproval, setIsWaitingForMintApproval] = useState(false);
  const { quote: swapQuote, isLoading: isSwapLoading, error: swapError, getQuote, executeSwap, checkAllowance, getApprovalTransaction, reset: resetSwap } = use1inchSwap();

  const [activeTab, setActiveTab] = useState<'invest' | 'redeem'>('invest');
  const [mode, setMode] = useState<'default' | 'advanced'>('default');
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [redeemAmount, setRedeemAmount] = useState<string>('');
  // Start with safe 80/20 split by default (noob-friendly)
  const [ptRatio, setPtRatio] = useState<number>(80);
  const [ytRatio, setYtRatio] = useState<number>(20);
  const [profitTake, setProfitTake] = useState<number>(15);
  const [lossCut, setLossCut] = useState<number>(-5);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [isExecutingSwapAndBuy, setIsExecutingSwapAndBuy] = useState(false);

  // Toast management - use ref to track current toast to avoid re-creating callback
  const currentToastIdRef = React.useRef<string | null>(null);

  // Flow state machine for swap process
  type SwapFlowState = 'idle' | 'checking_allowance' | 'approving' | 'waiting_approval'
                     | 'swapping' | 'waiting_swap' | 'executing_purchase' | 'complete';
  const [flowState, setFlowState] = useState<SwapFlowState>('idle');

  // Managed toast function - dismisses previous toast before showing new one
  const showManagedToast = React.useCallback((toast: Parameters<typeof showToast>[0]) => {
    if (currentToastIdRef.current) {
      removeToast(currentToastIdRef.current);
    }
    const id = showToast(toast);
    currentToastIdRef.current = id;
    return id;
  }, [removeToast, showToast]);

  // Approval transaction state
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

  // Swap transaction state
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
  // 2. underlyingAssetAddress from pool (legacy format)
  // 3. Token address from constants (fetched by symbol)
  // 4. Pool's underlying asset address (if it's actually an address)
  const poolTokenAddress = (pool as any).underlyingAssetAddress ||
    (typeof pool.underlyingAsset === 'string'
      ? pool.underlyingAsset
      : (pool.underlyingAsset as any)?.address);

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
      safeLog('🔍 [DEBUG] Token address resolution:', {
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
    safeLog('🔍 Balance check debug:', {
      address,
      tokenSymbol,
      poolTokenAddress,
      underlyingTokenAddress,
      isValidTokenAddress,
      isLoadingTokenAddress,
    });
  }, [address, tokenSymbol, poolTokenAddress, underlyingTokenAddress, isValidTokenAddress, isLoadingTokenAddress]);

  // Get PT, YT, and SY token addresses
  // Try both the unified type (ptToken/ytToken/syToken as Token objects) and legacy type (ptAddress/ytAddress/syAddress as strings)
  const ptTokenAddress = (pool as any).ptAddress || (typeof (pool as any).ptToken === 'string' ? (pool as any).ptToken : (pool as any).ptToken?.address);
  const ytTokenAddress = (pool as any).ytAddress || (typeof (pool as any).ytToken === 'string' ? (pool as any).ytToken : (pool as any).ytToken?.address);
  const syTokenAddress = (pool as any).syAddress || (typeof (pool as any).syToken === 'string' ? (pool as any).syToken : (pool as any).syToken?.address);

  // Normalize addresses (remove chainId prefix) using our utility
  const normalizePtAddress = normalizeAddress(ptTokenAddress || '');
  const normalizeYtAddress = normalizeAddress(ytTokenAddress || '');
  const normalizeSyAddress = normalizeAddress(syTokenAddress || '');

  // Batch fetch all token balances in a single multicall (5 RPC calls → 1 multicall!)
  const { balances, isLoading: isLoadingBalances } = usePendleStrategyBalances({
    underlyingAddress: isValidTokenAddress ? underlyingTokenAddress : undefined,
    usdcAddress: BASE_TOKENS.USDC,
    ptAddress: normalizePtAddress,
    ytAddress: normalizeYtAddress,
    syAddress: normalizeSyAddress,
    userAddress: address,
    enabled: !!address,
  });

  // Extract individual balances from the batched result
  const userBalance = balances.underlying || { formatted: 0, decimals: 18, isLoading: isLoadingBalances };
  const usdcBalance = balances.usdc || { formatted: 0, decimals: 6, isLoading: isLoadingBalances };
  const ptBalance = balances.pt || { formatted: 0, decimals: 18, isLoading: isLoadingBalances };
  const ytBalance = balances.yt || { formatted: 0, decimals: 18, isLoading: isLoadingBalances };
  const syBalance = balances.sy || { formatted: 0, decimals: 18, isLoading: isLoadingBalances };

  // Determine if user has redeemable tokens
  const hasRedeemableTokens = (ptBalance.formatted > 0 && ytBalance.formatted > 0) || syBalance.formatted > 0;
  const canRedeemPy = ptBalance.formatted > 0 && ytBalance.formatted > 0;
  const canRedeemSy = syBalance.formatted > 0;

  // Sync ratios when mode changes
  React.useEffect(() => {
    if (mode === 'default') {
      // Default mode: Always use safe 80/20 split for noobs
      setPtRatio(80);
      setYtRatio(20);
    } else {
      // Advanced mode: Use the algorithm's recommended allocation
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

    console.log('💰 Calculated amounts:', {
      investmentAmount,
      total,
      ptRatio,
      ytRatio,
      ptAmount,
      ytAmount,
    });

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
        slippage: 2, // 2% slippage for 1inch swap
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
      const chainId = (pool as any).chainId || 8453;

      // Step 1: Check allowance
      setFlowState('checking_allowance');
      showManagedToast({
        type: 'loading',
        title: 'Step 1/3: Checking Approval',
        message: 'Verifying USDC allowance...',
      });

      const allowance = await checkAllowance({
        tokenAddress: BASE_TOKENS.USDC,
        walletAddress: address,
        chainId,
      });

      // Convert investment amount to token units (USDC has 6 decimals)
      const amountInTokenUnits = Math.floor(parseFloat(investmentAmount) * 1e6);

      // Step 2: Approve if needed
      if (!allowance || BigInt(allowance) < BigInt(amountInTokenUnits)) {
        setFlowState('approving');
        showManagedToast({
          type: 'info',
          title: 'Approval Required',
          message: 'Please approve USDC spending in your wallet...',
          duration: 2000,
        });

        const approvalResponse = await getApprovalTransaction({
          tokenAddress: BASE_TOKENS.USDC,
          amount: investmentAmount,
          decimals: 6,
          chainId,
        });

        if (!approvalResponse || !approvalResponse.tx) {
          throw new Error('Failed to get approval transaction');
        }

        // Execute approval transaction
        console.log('Sending approval transaction:', approvalResponse.tx);

        // Construct transaction parameters - don't include gas or value if not provided
        const approvalTxParams: any = {
          to: approvalResponse.tx.to as `0x${string}`,
          data: approvalResponse.tx.data as `0x${string}`,
        };

        // Only add value if it's greater than 0
        if (approvalResponse.tx.value && BigInt(approvalResponse.tx.value) > BigInt(0)) {
          approvalTxParams.value = BigInt(approvalResponse.tx.value);
        }

        // Only add gas if provided
        if (approvalResponse.tx.gas) {
          approvalTxParams.gas = BigInt(approvalResponse.tx.gas);
        }

        console.log('Approval TX params:', approvalTxParams);
        sendApproval(approvalTxParams);

        // Update flow state
        setFlowState('waiting_approval');
        showManagedToast({
          type: 'loading',
          title: 'Step 1/3: Approving USDC',
          message: 'Waiting for approval confirmation...',
        });

        // The component will re-render when isApprovalConfirmed changes
        // We'll handle the next steps in a useEffect
        return;
      }

      // Step 3: Execute swap (only if approval not needed or already approved)
      showManagedToast({
        type: 'success',
        title: 'Approval Not Needed',
        message: 'Sufficient allowance already set',
        duration: 1500,
      });

      setTimeout(() => {
        proceedWithSwap();
      }, 1500);
    } catch (error) {
      console.error('Swap and buy error:', error);
      setFlowState('idle');
      showManagedToast({
        type: 'error',
        title: 'Transaction Failed',
        message: error instanceof Error ? error.message : 'Failed to execute transaction',
        duration: 5000,
      });
      setIsExecutingSwapAndBuy(false);
    }
  };

  /**
   * Proceed with swap after approval is confirmed
   */
  const proceedWithSwap = async () => {
    if (!address || !investmentAmount || !underlyingTokenAddress) return;

    try {
      const chainId = (pool as any).chainId || 8453;

      setFlowState('swapping');
      showManagedToast({
        type: 'loading',
        title: 'Step 2/3: Swapping USDC',
        message: `Swapping USDC to ${tokenSymbol}...`,
      });

      // Get swap transaction data
      const swapResponse = await fetch('/api/1inch/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: BASE_TOKENS.USDC,
          toToken: underlyingTokenAddress,
          amount: investmentAmount,
          fromAddress: address,
          fromDecimals: 6,
          slippage: 2, // 2% slippage for 1inch swap
          chainId,
        }),
      });

      const swapData = await swapResponse.json();

      console.log('📦 Swap API response:', swapData);

      if (!swapData.success) {
        const errorMsg = swapData.error || 'Failed to get swap transaction';
        console.error('❌ Swap API error:', errorMsg);
        throw new Error(errorMsg);
      }

      if (!swapData.data) {
        console.error('❌ Invalid swap data:', swapData);
        throw new Error('Swap API did not return transaction data');
      }

      // The API returns the transaction directly in data, not in data.tx
      const swapTx = swapData.data;

      // Execute swap transaction
      console.log('Sending swap transaction:', swapTx);

      // Construct transaction parameters
      const swapTxParams: any = {
        to: swapTx.to as `0x${string}`,
        data: swapTx.data as `0x${string}`,
      };

      // Only add value if it's greater than 0
      if (swapTx.value && BigInt(swapTx.value) > BigInt(0)) {
        swapTxParams.value = BigInt(swapTx.value);
      }

      // Only add gas if provided
      if (swapTx.gas) {
        swapTxParams.gas = BigInt(swapTx.gas);
      }

      console.log('Swap TX params:', swapTxParams);
      sendSwap(swapTxParams);

      // Update state to waiting for swap confirmation
      setFlowState('waiting_swap');

      // Wait for swap confirmation in useEffect
    } catch (error) {
      console.error('Swap error:', error);
      setFlowState('idle');
      showManagedToast({
        type: 'error',
        title: 'Swap Failed',
        message: error instanceof Error ? error.message : 'Failed to execute swap',
        duration: 5000,
      });
      setIsExecutingSwapAndBuy(false);
    }
  };

  // Handle approval confirmation
  React.useEffect(() => {
    if (isApprovalConfirmed && isExecutingSwapAndBuy && flowState === 'waiting_approval') {
      showManagedToast({
        type: 'success',
        title: '✅ Approval Successful!',
        message: 'Proceeding with swap in 2 seconds...',
        duration: 2000,
      });

      // Wait for the approval to be fully propagated on-chain
      setTimeout(() => {
        console.log('✅ Approval confirmed, proceeding with swap...');
        proceedWithSwap();
      }, 2000);
    }
  }, [isApprovalConfirmed, isExecutingSwapAndBuy, flowState]);

  // Handle swap confirmation
  React.useEffect(() => {
    if (isSwapConfirmed && isExecutingSwapAndBuy && flowState === 'waiting_swap') {
      // Update flow state
      setFlowState('executing_purchase');

      // Close modal
      setShowSwapModal(false);
      resetSwap();

      // Show success message
      showManagedToast({
        type: 'success',
        title: '✅ Swap Complete!',
        message: `Swapped USDC to ${tokenSymbol}. Checking received amount...`,
        duration: 2000,
      });

      // Wait for balances to update on-chain, then execute PT/YT purchase
      setTimeout(async () => {
        console.log('✅ Swap confirmed, proceeding with PT/YT purchase...');

        // Apply 2% slippage tolerance to account for swap variance
        // Use 98% of the original amount to ensure we have enough balance
        const SLIPPAGE_BUFFER = 0.98; // 2% below submitted amount
        const amountForPurchase = parseFloat(investmentAmount) * SLIPPAGE_BUFFER;

        safeLog('💰 Proceeding with PT/YT purchase after swap (with 2% slippage buffer):', {
          originalInput: investmentAmount,
          slippageBuffer: '2%',
          amountForPurchase,
          tokenSymbol,
        });

        // Validate amount
        if (isNaN(amountForPurchase) || amountForPurchase <= 0) {
          showManagedToast({
            type: 'error',
            title: 'Invalid Amount',
            message: `Failed to parse investment amount: ${investmentAmount}`,
            duration: 5000,
          });
          setIsExecutingSwapAndBuy(false);
          return;
        }

        // Show step 3 toast
        showManagedToast({
          type: 'loading',
          title: 'Step 3/3: Purchasing PT/YT',
          message: `Purchasing PT/YT with swapped ${tokenSymbol} (${amountForPurchase.toFixed(4)})...`,
        });

        // Execute the PT/YT purchase with slippage-adjusted amount
        handleExecute(amountForPurchase);

        setIsExecutingSwapAndBuy(false);
      }, 2500);
    }
  }, [isSwapConfirmed, isExecutingSwapAndBuy, flowState, swapHash, tokenSymbol, userBalance.formatted]);

  // Handle mint approval confirmation - execute mint after approval
  React.useEffect(() => {
    if (isMintSuccess && isWaitingForMintApproval && pendingMintTx) {
      console.log('✅ Mint approval confirmed! Executing mint in 2 seconds...');

      showToast({
        type: 'success',
        title: '✅ Approval Successful!',
        message: 'Proceeding with minting in 2 seconds...',
        duration: 2000,
      });

      // Wait for approval to propagate, then execute mint
      setTimeout(() => {
        showToast({
          type: 'loading',
          title: 'Step 2/2: Minting PT/YT',
          message: 'Please confirm the mint transaction...',
          duration: 0,
        });

        executeMintTx(pendingMintTx);
        setPendingMintTx(null);
        setIsWaitingForMintApproval(false);
      }, 2000);
    }
  }, [isMintSuccess, isWaitingForMintApproval, pendingMintTx, executeMintTx, showToast]);

  // Handle approval errors
  React.useEffect(() => {
    if (approvalSendError && isExecutingSwapAndBuy) {
      console.error('Approval send error:', approvalSendError);
      setFlowState('idle');
      showManagedToast({
        type: 'error',
        title: 'Approval Failed',
        message: approvalSendError.message || 'Failed to send approval transaction. Please try again.',
        duration: 5000,
      });
      setIsExecutingSwapAndBuy(false);
    }
  }, [approvalSendError, isExecutingSwapAndBuy]);

  React.useEffect(() => {
    if (isApprovalError && approvalReceiptError && isExecutingSwapAndBuy) {
      console.error('Approval receipt error:', approvalReceiptError);
      setFlowState('idle');
      showManagedToast({
        type: 'error',
        title: 'Approval Transaction Failed',
        message: 'The approval transaction failed on-chain. Please try again.',
        duration: 5000,
      });
      setIsExecutingSwapAndBuy(false);
    }
  }, [isApprovalError, approvalReceiptError, isExecutingSwapAndBuy]);

  // Handle swap errors
  React.useEffect(() => {
    if (swapSendError && isExecutingSwapAndBuy) {
      console.error('Swap send error:', swapSendError);
      setFlowState('idle');
      showManagedToast({
        type: 'error',
        title: 'Swap Failed',
        message: swapSendError.message || 'Failed to send swap transaction. Please try again.',
        duration: 5000,
      });
      setIsExecutingSwapAndBuy(false);
    }
  }, [swapSendError, isExecutingSwapAndBuy]);

  React.useEffect(() => {
    if (isSwapError && swapReceiptError && isExecutingSwapAndBuy) {
      console.error('Swap receipt error:', swapReceiptError);
      setFlowState('idle');
      showManagedToast({
        type: 'error',
        title: 'Swap Transaction Failed',
        message: 'The swap transaction failed on-chain. Please try again.',
        duration: 5000,
      });
      setIsExecutingSwapAndBuy(false);
    }
  }, [isSwapError, swapReceiptError, isExecutingSwapAndBuy]);

  const handleExecute = async (overrideAmount?: number) => {
    if (!address) {
      showToast({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to execute the strategy',
      });
      return;
    }

    // Use override amount if provided (from swap), otherwise use user input
    const amountToUse = overrideAmount !== undefined ? overrideAmount.toString() : investmentAmount;

    // Validate that amountToUse is a valid string/number
    safeLog('🔍 [DEBUG] Amount validation:', {
      overrideAmount,
      investmentAmount,
      amountToUse,
      amountType: typeof amountToUse,
      isString: typeof amountToUse === 'string',
      parsedFloat: parseFloat(amountToUse),
    });

    if (!amountToUse || typeof amountToUse !== 'string' || parseFloat(amountToUse) <= 0 || isNaN(parseFloat(amountToUse))) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: `Please enter a valid investment amount. Got: ${typeof amountToUse} = ${amountToUse}`,
      });
      return;
    }

    // Skip balance check if using override amount (coming from swap)
    if (overrideAmount === undefined && !hasSufficientBalance) {
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
      
      if (!underlyingToken || !isValidAddress(underlyingToken)) {
        // Try to get from pool - check underlyingAssetAddress first (legacy format)
        const poolUnderlyingAsset = (pool as any).underlyingAssetAddress ||
          (typeof pool.underlyingAsset === 'string'
            ? pool.underlyingAsset
            : (pool.underlyingAsset as any)?.address);

        safeLog('🔍 [DEBUG] Getting underlying token address:', {
          providedTokenAddress,
          poolUnderlyingAsset,
          poolUnderlyingAssetAddress: (pool as any).underlyingAssetAddress,
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
            
            safeLog('🔍 [DEBUG] Looked up token address by symbol:', {
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
      // Try both the unified type (ptToken/ytToken as Token objects) and legacy type (ptAddress/ytAddress as strings)
      let ptToken = (pool as any).ptAddress ||
        (typeof (pool as any).ptToken === 'string'
          ? (pool as any).ptToken
          : (pool as any).ptToken?.address);

      let ytToken = (pool as any).ytAddress ||
        (typeof (pool as any).ytToken === 'string'
          ? (pool as any).ytToken
          : (pool as any).ytToken?.address);
      
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
      
      safeLog('🔍 [DEBUG] Executing mint with addresses:', {
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

      // Get token decimals (USDC = 6, most others = 18)
      const tokenDecimals = await getTokenDecimals(underlyingToken || tokenSymbol || '', (pool as any).chainId || 8453);

      safeLog('🔍 [DEBUG] Before parseUnits:', {
        amountToUse,
        type: typeof amountToUse,
        isString: typeof amountToUse === 'string',
        value: amountToUse,
        tokenSymbol,
        underlyingToken,
        tokenDecimals,
      });

      const totalAmountWei = parseUnits(amountToUse, tokenDecimals).toString();

      safeLog('🔍 [DEBUG] Executing mint with amount:', {
        originalInput: investmentAmount,
        actualAmount: amountToUse,
        totalAmountWei,
        isFromSwap: overrideAmount !== undefined,
      });
      
      const mintResult = await executeMintPy({
        chainId: (pool as any).chainId || 8453,
        tokenIn: underlyingToken,
        amountIn: totalAmountWei,
        ptToken,
        ytToken,
        receiver: address,
        slippage: 0.02, // 2% slippage tolerance
      });

      // Check if approval is needed
      if (mintResult?.needsApproval && mintResult?.approvals && mintResult?.mintTxData) {
        console.log('⏳ Approval required before minting...');

        // Store mint tx data for later
        setPendingMintTx(mintResult.mintTxData);
        setIsWaitingForMintApproval(true);

        // Show approval toast
        showToast({
          type: 'loading',
          title: 'Step 1/2: Approval Required',
          message: 'Please approve token spending in your wallet...',
          duration: 0,
        });

        // Send approval transaction
        const approval = mintResult.approvals[0];
        const approvalTx = {
          to: approval.token as `0x${string}`,
          data: `0x095ea7b3${approval.spender.slice(2).padStart(64, '0')}${'f'.repeat(64)}` as `0x${string}`,
        };

        sendMintApproval(approvalTx);
        return;
      }

      // No approval needed or already approved - mint transaction was sent
      
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

        safeLog('🔄 Redeeming PT + YT:', {
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
          slippage: 0.02, // 2% slippage tolerance
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

        safeLog('🔄 Redeeming SY:', {
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
          slippage: 0.02, // 2% slippage tolerance
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
      // If this was part of the swap flow, show completion message
      if (flowState === 'executing_purchase') {
        setFlowState('complete');
        showManagedToast({
          type: 'success',
          title: '🎉 All Complete!',
          message: 'Swap & PT/YT purchase successful! Refreshing data...',
          action: {
            label: 'View Transaction',
            onClick: () => {
              window.open(`https://basescan.org/tx/${mintHash}`, '_blank');
            },
          },
          duration: 7000,
        });

        // Reset flow state and refresh data
        setTimeout(() => {
          setFlowState('idle');
          // Trigger data refresh
          if (onSuccess) {
            console.log('🔄 Refreshing recommendations after successful execution...');
            onSuccess();
          }
        }, 3000); // Wait 3 seconds for transaction to settle before refreshing
      } else {
        // Normal mint without swap flow
        showToast({
          type: 'success',
          title: 'Strategy Executed Successfully!',
          message: `Transaction confirmed. PT + YT tokens minted. Refreshing data...`,
          action: {
            label: 'View on BaseScan',
            onClick: () => {
              window.open(`https://basescan.org/tx/${mintHash}`, '_blank');
            },
          },
        });

        // Trigger data refresh after normal execution
        setTimeout(() => {
          if (onSuccess) {
            console.log('🔄 Refreshing recommendations after successful execution...');
            onSuccess();
          }
        }, 3000);
      }
    }
  }, [isMintSuccess, mintHash, flowState, showToast, onSuccess]);

  React.useEffect(() => {
    if (mintError) {
      // Reset flow state if error occurred during swap flow
      if (flowState === 'executing_purchase') {
        setFlowState('idle');
        showManagedToast({
          type: 'error',
          title: 'PT/YT Purchase Failed',
          message: mintError.message || 'Failed to execute strategy after swap',
          duration: 5000,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Transaction Error',
          message: mintError.message || 'An error occurred during execution',
        });
      }
    }
  }, [mintError, flowState, showToast]);

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
              Target Allocation: PT {ptRatio}%
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              YT {ytRatio}%
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            (Minting creates 50/50, swap manually to achieve target)
          </p>

          {mode === 'default' ? (
            <Progress value={ptRatio} className="h-2" />
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
              <Progress value={ptRatio} className="h-2" />
            </div>
          )}
        </div>

        {/* Advanced Mode Settings */}
        {mode === 'advanced' && (
          <div className="mt-4 space-y-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            {/* Show algorithm recommendation */}
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
              <span className="font-semibold text-blue-700 dark:text-blue-300">💡 Algorithm suggests:</span>
              <span className="text-blue-600 dark:text-blue-400 ml-1">
                PT {Math.round(defaultPtPercentage * 100)}% / YT {Math.round(defaultYtPercentage * 100)}%
              </span>
            </div>
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
          <div className="relative">
            <input
              type="number"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 pr-20 border rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                if (userBalance.formatted > 0) {
                  setInvestmentAmount(userBalance.formatted.toString());
                }
              }}
              disabled={!address || userBalance.isLoading || !isValidTokenAddress}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MAX
            </button>
          </div>
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
              Will Mint (Pendle always creates equal PT and YT):
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">PT tokens:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {parseFloat(investmentAmount).toFixed(2)} PT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">YT tokens:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {parseFloat(investmentAmount).toFixed(2)} YT
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
              ℹ️ Pendle mints PT and YT in 1:1 ratio. To achieve {ptRatio}/{ytRatio} allocation, you can swap tokens after minting.
            </p>
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
            onClick={canSwapUSDC ? handleSwapAndBuy : () => handleExecute()}
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

