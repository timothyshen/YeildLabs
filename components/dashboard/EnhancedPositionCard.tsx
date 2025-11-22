'use client';

import { useState } from 'react';
import type { UserPosition } from '@/types';

interface EnhancedPositionCardProps {
  position: UserPosition;
  onManage?: (pool: string, action: 'roll' | 'exit' | 'add') => void;
}

export function EnhancedPositionCard({ position, onManage }: EnhancedPositionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const totalPnL = position.realizedPnL + position.unrealizedPnL;
  const pnlPercent = position.costBasis !== 0
    ? (totalPnL / position.costBasis) * 100
    : 0;
  const isProfitable = totalPnL >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              {position.pool}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Principal & Yield Tokens
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(position.currentValue)}
            </p>
            <p className={`text-sm font-medium ${
              isProfitable ? 'text-green-600' : 'text-red-600'
            }`}>
              {isProfitable ? '+' : ''}{formatCurrency(totalPnL)} ({isProfitable ? '+' : ''}{pnlPercent.toFixed(2)}%)
            </p>
          </div>
        </div>

        {/* Token Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">PT Balance</p>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {position.ptBalance.toFixed(4)}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">YT Balance</p>
            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {position.ytBalance.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Expand indicator */}
        <div className="flex justify-center mt-4">
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {isExpanded ? '▲ Less' : '▼ More'}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Detailed Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cost Basis</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatCurrency(position.costBasis)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Maturity Value</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatCurrency(position.maturityValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Realized PnL</p>
              <p className={`text-sm font-medium ${
                position.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {position.realizedPnL >= 0 ? '+' : ''}{formatCurrency(position.realizedPnL)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Unrealized PnL</p>
              <p className={`text-sm font-medium ${
                position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {position.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
              </p>
            </div>
          </div>

          {/* Additional Balances */}
          {(position.syBalance > 0 || position.lpBalance > 0) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {position.syBalance > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">SY Balance</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {position.syBalance.toFixed(4)}
                  </p>
                </div>
              )}
              {position.lpBalance > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">LP Balance</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {position.lpBalance.toFixed(4)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManage?.(position.pool, 'add');
              }}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Add More
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManage?.(position.pool, 'roll');
              }}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Roll PT
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManage?.(position.pool, 'exit');
              }}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
