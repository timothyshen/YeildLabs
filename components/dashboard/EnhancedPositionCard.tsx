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

  // Handle both old and new API response formats
  const poolName = (position as any).pool?.name || position.pool;
  const ptBalance = (position as any).ptBalanceFormatted || position.ptBalance || 0;
  const ytBalance = (position as any).ytBalanceFormatted || position.ytBalance || 0;
  const currentValue = position.currentValue || 0;
  const unrealizedPnL = position.unrealizedPnL || 0;
  const realizedPnL = position.realizedPnL || 0;
  const costBasis = (position as any).entryValue || position.costBasis || currentValue;
  const poolApy = (position as any).pool?.apy || 0;
  const poolMaturity = (position as any).pool?.maturity;
  const ptValue = (position as any).ptValue || 0;
  const ytValue = (position as any).ytValue || 0;

  const totalPnL = realizedPnL + unrealizedPnL;
  const pnlPercent = costBasis !== 0 ? (totalPnL / costBasis) * 100 : 0;
  const isProfitable = totalPnL >= 0;

  // Calculate days to maturity
  const daysToMaturity = poolMaturity
    ? Math.floor((poolMaturity * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="glass rounded-xl shadow-lg overflow-hidden border transition-all hover:shadow-xl">
      {/* Header */}
      <div
        className="p-6 cursor-pointer hover:bg-white/10 transition-all"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              {poolName}
            </h4>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Principal & Yield Tokens
              </p>
              {poolApy > 0 && (
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                  {(poolApy / 100).toFixed(2)}% APY
                </span>
              )}
              {daysToMaturity !== null && (
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  daysToMaturity <= 30
                    ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {daysToMaturity}d to maturity
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(currentValue)}
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
              {ptBalance.toFixed(4)}
            </p>
            {ptValue > 0 && (
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                ≈ {formatCurrency(ptValue)}
              </p>
            )}
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">YT Balance</p>
            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {ytBalance.toFixed(4)}
            </p>
            {ytValue > 0 && (
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                ≈ {formatCurrency(ytValue)}
              </p>
            )}
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
                {formatCurrency(costBasis)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Value</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatCurrency(currentValue)}
              </p>
            </div>
            {realizedPnL !== 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Realized PnL</p>
                <p className={`text-sm font-medium ${
                  realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {realizedPnL >= 0 ? '+' : ''}{formatCurrency(realizedPnL)}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Unrealized PnL</p>
              <p className={`text-sm font-medium ${
                unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(unrealizedPnL)}
              </p>
            </div>
            {poolApy > 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pool APY</p>
                <p className="text-sm font-medium text-green-600">
                  {(poolApy / 100).toFixed(2)}%
                </p>
              </div>
            )}
            {daysToMaturity !== null && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Days to Maturity</p>
                <p className={`text-sm font-medium ${
                  daysToMaturity <= 30 ? 'text-orange-600' : 'text-gray-900 dark:text-white'
                }`}>
                  {daysToMaturity} days
                </p>
              </div>
            )}
          </div>

          {/* Additional Balances */}
          {((position as any).syBalance > 0 || (position as any).lpBalance > 0) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {(position as any).syBalance > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">SY Balance</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {(position as any).syBalance.toFixed(4)}
                  </p>
                </div>
              )}
              {(position as any).lpBalance > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">LP Balance</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {(position as any).lpBalance.toFixed(4)}
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
                onManage?.(poolName, 'add');
              }}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Add More
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManage?.(poolName, 'roll');
              }}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Roll PT
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManage?.(poolName, 'exit');
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
