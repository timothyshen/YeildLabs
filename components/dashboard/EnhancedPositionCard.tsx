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
  const ptBalance = parseFloat((position as any).ptBalanceFormatted || position.ptBalance || 0);
  const ytBalance = parseFloat((position as any).ytBalanceFormatted || position.ytBalance || 0);
  const currentValue = parseFloat(position.currentValue || 0);
  const unrealizedPnL = parseFloat(position.unrealizedPnL || 0);
  const realizedPnL = parseFloat(position.realizedPnL || 0);
  const costBasis = parseFloat((position as any).entryValue || position.costBasis || currentValue);
  const poolApy = parseFloat((position as any).pool?.apy || 0);
  const poolMaturity = (position as any).pool?.maturity;
  const ptValue = parseFloat((position as any).ptValue || 0);
  const ytValue = parseFloat((position as any).ytValue || 0);

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
        {/* Title and Value Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {poolName}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Principal & Yield Tokens
            </p>
          </div>
          <div className="text-right ml-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(currentValue)}
            </p>
            <p className={`text-sm font-medium mt-1 ${
              isProfitable ? 'text-green-600' : 'text-red-600'
            }`}>
              {isProfitable ? '+' : ''}{formatCurrency(totalPnL)} ({isProfitable ? '+' : ''}{pnlPercent.toFixed(2)}%)
            </p>
          </div>
        </div>

        {/* Badges Row */}
        <div className="flex items-center gap-2 mb-4">
          {poolApy > 0 && (
            <span className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-semibold rounded-full">
              {(poolApy / 100).toFixed(2)}% APY
            </span>
          )}
          {daysToMaturity !== null && (
            <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${
              daysToMaturity <= 30
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}>
              {daysToMaturity}d to maturity
            </span>
          )}
        </div>

        {/* Token Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800/30">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">PT Balance</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1">
              {ptBalance.toFixed(4)}
            </p>
            {ptValue > 0 && (
              <p className="text-sm text-blue-700 dark:text-blue-300">
                ≈ {formatCurrency(ptValue)}
              </p>
            )}
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800/30">
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2 uppercase tracking-wide">YT Balance</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-1">
              {ytBalance.toFixed(4)}
            </p>
            {ytValue > 0 && (
              <p className="text-sm text-purple-700 dark:text-purple-300">
                ≈ {formatCurrency(ytValue)}
              </p>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        <div className="flex justify-center mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            {isExpanded ? (
              <>
                <span>Show Less</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                <span>Show Details</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
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
