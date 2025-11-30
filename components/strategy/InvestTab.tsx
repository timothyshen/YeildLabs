'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { TokenAddressIndicator } from '@/components/ui/TokenAddressIndicator';

interface TokenBalance {
  formatted: number;
  decimals: number;
  isLoading: boolean;
}

interface InvestTabProps {
  comment: string;
  ptRatio: number;
  ytRatio: number;
  defaultPtPercentage: number;
  defaultYtPercentage: number;
  mode: 'default' | 'advanced';
  apy7d: number;
  apy30d: number;
  investmentAmount: string;
  onInvestmentAmountChange: (amount: string) => void;
  onRatioChange: (ptRatio: number) => void;
  profitTake: number;
  lossCut: number;
  onProfitTakeChange: (value: number) => void;
  onLossCutChange: (value: number) => void;
  userBalance: TokenBalance;
  usdcBalance: TokenBalance;
  tokenSymbol: string;
  underlyingTokenAddress: string | null;
  isLoadingTokenAddress: boolean;
  isValidTokenAddress: boolean;
  hasSufficientBalance: boolean;
  canSwapUSDC: boolean;
  isConnected: boolean;
}

export const InvestTab: React.FC<InvestTabProps> = React.memo(({
  comment,
  ptRatio,
  ytRatio,
  defaultPtPercentage,
  defaultYtPercentage,
  mode,
  apy7d,
  apy30d,
  investmentAmount,
  onInvestmentAmountChange,
  onRatioChange,
  profitTake,
  lossCut,
  onProfitTakeChange,
  onLossCutChange,
  userBalance,
  usdcBalance,
  tokenSymbol,
  underlyingTokenAddress,
  isLoadingTokenAddress,
  isValidTokenAddress,
  hasSufficientBalance,
  canSwapUSDC,
  isConnected,
}) => {
  return (
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
              onChange={(e) => onRatioChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <Progress value={ptRatio} className="h-2" />
          </div>
        )}
      </div>

      {/* Advanced Mode Settings */}
      {mode === 'advanced' && (
        <div className="mt-4 space-y-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
            <span className="font-semibold text-blue-700 dark:text-blue-300">Algorithm suggests:</span>
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
                onChange={(e) => onProfitTakeChange(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => onLossCutChange(parseFloat(e.target.value) || 0)}
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
            onChange={(e) => onInvestmentAmountChange(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2 pr-20 border rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              if (userBalance.formatted > 0) {
                onInvestmentAmountChange(userBalance.formatted.toString());
              }
            }}
            disabled={!isConnected || userBalance.isLoading || !isValidTokenAddress}
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
            {!isConnected ? (
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

        {isConnected && canSwapUSDC && (
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
            Pendle mints PT and YT in 1:1 ratio. To achieve {ptRatio}/{ytRatio} allocation, you can swap tokens after minting.
          </p>
          {!hasSufficientBalance && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Insufficient balance. You need ${parseFloat(investmentAmount).toFixed(2)} but only have ${userBalance.formatted.toFixed(4)}.
              {canSwapUSDC && (
                <span className="block text-purple-600 dark:text-purple-400 mt-1">
                  You can swap USDC to get the required amount
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </>
  );
});

InvestTab.displayName = 'InvestTab';
