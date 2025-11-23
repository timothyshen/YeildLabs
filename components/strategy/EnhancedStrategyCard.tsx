'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Settings, Zap } from 'lucide-react';
import { parseEther, formatEther } from 'viem';
import { usePendleMint } from '@/lib/hooks/usePendleMint';
import { useAccount } from 'wagmi';
import { useTokenBalance } from '@/lib/hooks/useTokenBalance';
import { useToast } from '@/components/ui/Toast';
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
  onDetails,
}) => {
  const { address } = useAccount();
  const { executeMintPy, isLoading, isSuccess, hash, error } = usePendleMint();
  const { showToast } = useToast();
  
  const [mode, setMode] = useState<'default' | 'advanced'>('default');
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [ptRatio, setPtRatio] = useState<number>(Math.round(defaultPtPercentage * 100));
  const [ytRatio, setYtRatio] = useState<number>(Math.round(defaultYtPercentage * 100));
  const [profitTake, setProfitTake] = useState<number>(15);
  const [lossCut, setLossCut] = useState<number>(-5);

  // Get underlying token address
  const underlyingTokenAddress = typeof pool.underlyingAsset === 'string'
    ? pool.underlyingAsset
    : pool.underlyingAsset.address;

  // Check user's balance for the underlying token
  const userBalance = useTokenBalance({
    tokenAddress: underlyingTokenAddress,
    userAddress: address,
    enabled: !!address && !!underlyingTokenAddress,
  });

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
      // Get underlying token address
      const underlyingToken = typeof pool.underlyingAsset === 'string'
        ? pool.underlyingAsset
        : pool.underlyingAsset.address;

      const ptToken = typeof pool.ptToken === 'string'
        ? pool.ptToken
        : pool.ptToken.address;

      const ytToken = typeof pool.ytToken === 'string'
        ? pool.ytToken
        : pool.ytToken.address;

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
        chainId: pool.chainId || 8453,
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

  // Show success/error notifications
  React.useEffect(() => {
    if (isSuccess && hash) {
      showToast({
        type: 'success',
        title: 'Strategy Executed Successfully!',
        message: `Transaction confirmed. PT + YT tokens minted.`,
        action: {
          label: 'View on BaseScan',
          onClick: () => {
            window.open(`https://basescan.org/tx/${hash}`, '_blank');
          },
        },
      });
    }
  }, [isSuccess, hash, showToast]);

  React.useEffect(() => {
    if (error) {
      showToast({
        type: 'error',
        title: 'Transaction Error',
        message: error.message || 'An error occurred during execution',
      });
    }
  }, [error, showToast]);

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

      <CardContent className="mt-2">
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
        {address && underlyingTokenAddress && (
          <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Your Balance:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {userBalance.isLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  `${userBalance.formatted.toFixed(4)} ${typeof pool.underlyingAsset === 'string' ? pool.underlyingAsset : pool.underlyingAsset.symbol}`
                )}
              </span>
            </div>
          </div>
        )}

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
              </p>
            )}
          </div>
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

        <Button
          className={`rounded-xl px-6 py-2 font-medium flex items-center gap-2 disabled:opacity-50 ${
            !hasSufficientBalance && address && investmentAmount
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          onClick={handleExecute}
          disabled={
            !address || 
            !investmentAmount || 
            parseFloat(investmentAmount) <= 0 || 
            isLoading || 
            !hasSufficientBalance ||
            userBalance.isLoading
          }
        >
          {isLoading ? (
            <>
              <Zap className="w-4 h-4 animate-pulse" />
              Executing...
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
      </CardFooter>

      {/* Success/Error Messages */}
      {isSuccess && hash && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✅ Strategy executed!{' '}
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View Transaction
            </a>
          </p>
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            ❌ Error: {error.message}
          </p>
        </div>
      )}
    </Card>
  );
};

