'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MintFormProps {
  investmentAmount: string;
  onInvestmentAmountChange: (value: string) => void;
  userBalance: number;
  underlyingSymbol: string;
  ptRatio: number;
  ytRatio: number;
  isExecuting: boolean;
  canExecute: boolean;
  onExecute: () => void;
  executionStatus?: string;
}

export const MintForm = React.memo(function MintForm({
  investmentAmount,
  onInvestmentAmountChange,
  userBalance,
  underlyingSymbol,
  ptRatio,
  ytRatio,
  isExecuting,
  canExecute,
  onExecute,
  executionStatus,
}: MintFormProps) {
  const amount = parseFloat(investmentAmount) || 0;
  const hasEnoughBalance = userBalance >= amount;

  return (
    <div className="space-y-4">
      {/* Investment Amount Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Investment Amount
        </label>
        <div className="relative">
          <input
            type="number"
            value={investmentAmount}
            onChange={(e) => onInvestmentAmountChange(e.target.value)}
            placeholder="0.00"
            step="0.01"
            className="w-full px-4 py-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {underlyingSymbol}
            </span>
            <button
              onClick={() => onInvestmentAmountChange(userBalance.toString())}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"
            >
              MAX
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Balance: {userBalance.toFixed(4)} {underlyingSymbol}
          </p>
          {!hasEnoughBalance && amount > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Insufficient balance
            </p>
          )}
        </div>
      </div>

      {/* What You'll Receive */}
      {amount > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-3">
            Will Mint (Pendle always creates equal PT and YT):
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-purple-700 dark:text-purple-300">
                PT tokens:
              </span>
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                {amount.toFixed(2)} PT
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-purple-700 dark:text-purple-300">
                YT tokens:
              </span>
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                {amount.toFixed(2)} YT
              </span>
            </div>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-3 italic">
            ℹ️ Pendle mints PT and YT in 1:1 ratio. To achieve {ptRatio}/{ytRatio} allocation, you can swap tokens after minting.
          </p>
        </div>
      )}

      {/* Execution Status */}
      {executionStatus && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {executionStatus}
          </p>
        </div>
      )}

      {/* Execute Button */}
      <Button
        onClick={onExecute}
        disabled={!canExecute || isExecuting || !hasEnoughBalance || amount <= 0}
        className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-semibold shadow-lg"
      >
        {isExecuting ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Processing...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5 mr-2" />
            Mint PT/YT Tokens
          </>
        )}
      </Button>

      {!canExecute && !isExecuting && amount > 0 && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Connect your wallet to continue
        </p>
      )}
    </div>
  );
});
