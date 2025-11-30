'use client';

import React from 'react';

interface TokenBalance {
  formatted: number;
  decimals: number;
  isLoading: boolean;
}

interface RedeemTabProps {
  tokenSymbol: string;
  ptBalance: TokenBalance;
  ytBalance: TokenBalance;
  syBalance: TokenBalance;
  canRedeemPy: boolean;
  canRedeemSy: boolean;
  redeemAmount: string;
  onRedeemAmountChange: (amount: string) => void;
}

export const RedeemTab: React.FC<RedeemTabProps> = React.memo(({
  tokenSymbol,
  ptBalance,
  ytBalance,
  syBalance,
  canRedeemPy,
  canRedeemSy,
  redeemAmount,
  onRedeemAmountChange,
}) => {
  const maxRedeemAmount = canRedeemPy
    ? Math.min(ptBalance.formatted, ytBalance.formatted)
    : syBalance.formatted;

  return (
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
                You can redeem up to {Math.min(ptBalance.formatted, ytBalance.formatted).toFixed(4)} {tokenSymbol}
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
          onChange={(e) => onRedeemAmountChange(e.target.value)}
          placeholder="0.00"
          max={maxRedeemAmount}
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
  );
});

RedeemTab.displayName = 'RedeemTab';
